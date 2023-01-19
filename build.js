const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { minify } = require("html-minifier");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");

const bbencode = require("./bbcode");

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

const convertChat = (file, leadup) => {
    console.log(`Started converting ${file}`);

    const cleanFileName = path.basename(file, path.extname(file));
    const fileData = JSON.parse(fs.readFileSync(file).toString());

    let pageFrom = 0;
    let pageTo = 0;
    let pages = fileData;

    if (fileData.pages) {
        pageFrom = fileData.from - 1;
        pageTo = fileData.to - 1;
        pages = fileData.pages;
    }

    // HTML construction
    const newHTML = cheerio.load(templateHTML);

    // Navigation links
    let pagerLinks = "";
    for (let i = 1; i <= pages.length; i++) {
        pagerLinks += `<a href="?p=${i + pageFrom}">${i + pageFrom}</a>`;
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

    pages.forEach((raw, pageNumber) => {
        let data = minify(raw, {
            removeTagWhitespace: false,
            collapseInlineTagWhitespace: false,
            collapseWhitespace: true,
        });

        const dataHTML = cheerio.load(data);

        const el = cheerio.load(
            `<section id="page${
                pages.length - pageNumber + pageFrom
            }"></section>`
        );
        const page = el(`#page${pages.length - pageNumber + pageFrom}`);

        const contents = dataHTML("body").children();

        for (let i = 0; i < contents.length; i++) {
            page.append(bbencode(dataHTML.html(contents.get(i))));
        }

        freeHTML += el("body").html();
    });

    fs.mkdirSync(`./out/${leadup.join("/")}`, { recursive: true });
    fs.writeFileSync(
        `./out/${leadup.join("/")}/${cleanFileName}.html`,
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
};

const convertChatDeep = (item, leadup = []) => {
    if (fs.statSync(item).isDirectory()) {
        leadup.push(path.basename(item));

        fs.readdirSync(item).forEach((p) =>
            convertChatDeep(path.join(item, p), leadup)
        );
    } else {
        convertChat(item, leadup);
    }
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

        let data = minify(fs.readFileSync(`./groups/${file}`).toString(), {
            removeTagWhitespace: false,
            collapseInlineTagWhitespace: false,
            collapseWhitespace: true,
        });

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

        const pageAmount = Math.ceil(contents.length / 200);
        let pagerLinks = "";
        for (let i = 1; i <= pageAmount; i++) {
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

        for (let i = 1; i <= pageAmount; i++) {
            const el = cheerio.load(`<section id="page${i}"></section>`);
            const page = el(`#page${i}`);

            const start = (i - 1) * 200;
            let end = start + (contents.length - start);
            if (end - start > 200) end = start + 200;

            for (let j = start; j < end; j++) {
                page.append(bbencode(dataHTML.html(contents.get(j))));
            }

            freeHTML += el("body").html();
        }

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

    // Chats
    if (!fs.existsSync("./chats")) {
        process.stdin.once("data", function () {
            process.exit(1);
        });
        throw new Error(
            'Folder "chats" does not exist. Please execute MXRP Collector first.'
        );
    }

    fs.readdirSync("./chats").forEach((item) =>
        convertChatDeep(path.join("./chats", item))
    );

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
