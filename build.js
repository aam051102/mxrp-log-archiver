const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { minify } = require("html-minifier");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");

const parseBBCode = require("./bbcode");

const copyScript = () => {
    const templateScript = fs
        .readFileSync(path.join(__dirname, "./template/script.js"))
        .toString();

    return UglifyJS.minify({ "script.js": templateScript }, {}).code;
};

const copyStyle = () => {
    const templateStyle = fs
        .readFileSync(path.join(__dirname, "./template/style.css"))
        .toString();

    return new CleanCSS({}).minify(templateStyle).styles;
};

fs.mkdirSync("./out", { recursive: true });

const templateHTML = fs
    .readFileSync(path.join(__dirname, "./template/index.html"))
    .toString();

try {
    // Groups
    if (!fs.existsSync("./groups")) {
        process.stdin.once("data", function () {
            process.exit(1);
        });
        throw new Error(
            'Folder "groups" does not exist. Please execute MXRP Collector first.'
        );
    }

    fs.readdirSync("./groups").forEach(function (file) {
        console.log(`Started converting ${file}`);

        let data = parseBBCode(
            minify(fs.readFileSync(`./groups/${file}`).toString(), {
                removeTagWhitespace: false,
                collapseInlineTagWhitespace: false,
                collapseWhitespace: true,
            })
        );

        // Reverse dates
        const match = /<h2(?:(?!<h2).|\n)*/g;
        let dataReversed = "";
        let res;
        while ((res = match.exec(data))) {
            dataReversed = res[0] + dataReversed;
        }
        data = dataReversed;

        const dataHTML = cheerio.load(data);
        const newHTML = cheerio.load(templateHTML);
        const contents = dataHTML("body").children();

        // Navigation links
        const pageAmount = Math.ceil(contents.length / 200);

        let pagerLinks = "";
        for (let i = 1; i <= pageAmount; i++) {
            pagerLinks += `<a href="?p=${i}">${i}</a>`;

            const el = cheerio.load(`<section id="page${i}"></section>`);
            const page = el(`#page${i}`);

            const start = (i - 1) * 200;
            let end = start + (contents.length - start);
            if (end - start > 200) end = start + 200;

            for (let j = start; j < end; j++) {
                page.append(dataHTML.html(contents[j]));
            }

            newHTML("#conversation_wrap").append(page);
        }

        newHTML(".log_top_nav .pager").html(pagerLinks);
        newHTML(".log_bottom_nav .pager").html(pagerLinks);

        newHTML("body").append(`<script>${copyScript()}</script>`);
        newHTML("head").append(`<style>${copyStyle()}</style>`);

        fs.writeFileSync(
            `./out/${path.basename(file, path.extname(file))}.html`,
            minify(newHTML.html(), {
                removeTagWhitespace: false,
                collapseInlineTagWhitespace: false,
                collapseWhitespace: true,
                collapseBooleanAttributes: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: true,
            })
        );
    });

    // Chats
    if (!fs.existsSync("./chats")) {
        process.stdin.once("data", function () {
            process.exit(1);
        });
        throw new Error(
            'Folder "chats" does not exist. Please execute MXRP Collector first.'
        );
    }

    fs.readdirSync("./chats").forEach(function (file) {
        console.log(`Started converting ${file}`);

        const newHTML = cheerio.load(templateHTML);
        const fileData = JSON.parse(
            fs.readFileSync(`./chats/${file}`).toString()
        );

        // Navigation links
        let pagerLinks = "";
        for (let i = 1; i <= fileData.length; i++) {
            pagerLinks += `<a href="?p=${i}">${i}</a>`;
        }

        newHTML(".log_top_nav .pager").html(pagerLinks);
        newHTML(".log_bottom_nav .pager").html(pagerLinks);

        newHTML("body").append(`<script>${copyScript()}</script>`);
        newHTML("head").append(`<style>${copyStyle()}</style>`);

        const stringHTML = newHTML.html();
        let freeHTML = stringHTML.substring(
            0,
            stringHTML.indexOf('<div id="conversation_wrap">') +
                '<div id="conversation_wrap">'.length
        );
        const endFreeHTML = stringHTML.substring(
            stringHTML.indexOf('<div id="conversation_wrap">') +
                '<div id="conversation_wrap">'.length
        );

        fileData.forEach((raw, pageNumber) => {
            let data = parseBBCode(
                minify(raw, {
                    removeTagWhitespace: false,
                    collapseInlineTagWhitespace: false,
                    collapseWhitespace: true,
                })
            );

            const dataHTML = cheerio.load(data);
            const contents = dataHTML("body").children();

            const el = cheerio.load(
                `<section id="page${fileData.length - pageNumber}"></section>`
            );
            const page = el(`#page${fileData.length - pageNumber}`);

            page.append(dataHTML.html(contents));

            freeHTML += el.html();
        });

        fs.writeFileSync(
            `./out/${path.basename(file, path.extname(file))}.html`,
            minify(freeHTML + endFreeHTML, {
                removeTagWhitespace: false,
                collapseInlineTagWhitespace: false,
                collapseWhitespace: true,
                collapseBooleanAttributes: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: true,
            })
        );
    });

    console.log(
        "MXRP Builder",
        'Successfully ran MXRP Builder. Check the "out" directory for the generated pages.'
    );
} catch (e) {
    console.error(e);
    fs.writeFileSync(`./log-${new Date().getTime()}.txt`, e.toString());
}

process.stdin.once("data", function () {
    process.exit(0);
});
