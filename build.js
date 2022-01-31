const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { minify } = require("html-minifier");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");

const parseBBCode = require("./bbcode");

// Copy JavaScript and CSS
const copyJavaScriptAndCSS = () => {
    const templateScript = fs
        .readFileSync(path.join(__dirname, "./template/script.js"))
        .toString();
    const templateStyle = fs
        .readFileSync(path.join(__dirname, "./template/style.css"))
        .toString();

    fs.writeFileSync(
        "./out/script.js",
        UglifyJS.minify({ "script.js": templateScript }, {}).code
    );

    fs.writeFileSync(
        "./out/style.css",
        new CleanCSS({}).minify(templateStyle).styles
    );
};

// Convert HTML
if (!fs.existsSync("./convos")) {
    console.error(
        "MXRP Builder",
        'Folder "convos" does not exist. Please execute MXRP Collector first.'
    );

    process.stdin.once("data", function () {
        process.exit(1);
    });
    return;
}

fs.mkdirSync("./out", { recursive: true });

copyJavaScriptAndCSS();

const templateHTML = fs
    .readFileSync(path.join(__dirname, "./template/index.html"))
    .toString();
fs.readdirSync("./convos").forEach(function (file) {
    console.log(`Started converting ${file}`);

    let data = parseBBCode(
        minify(fs.readFileSync(`./convos/${file}`).toString(), {
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

console.log(
    "MXRP Builder",
    'Successfully ran MXRP Builder. Check the "out" directory for the generated pages.'
);

process.stdin.once("data", function () {
    process.exit(0);
});
