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

/// Converts a chat to HTML
const convertChat = (file, leadup) => {
    console.log(`Started converting ${file}`);

    const fileData = JSON.parse(fs.readFileSync(file).toString());

    let pageFrom = 0;
    let pageTo = 0;
    let pages = [];

    if (fileData.pages) {
        pageFrom = fileData.from + 1;
        pageTo = fileData.to;
        pages = fileData.pages;
    } else {
        pages = fileData;
        pageFrom = 1;
        pageTo = pageFrom + fileData.length - 1;
    }

    // HTML construction
    const newHTML = cheerio.load(templateHTML);

    // Navigation links
    let pagerLinks = "";
    for (let i = pageFrom; i <= pageTo; i++) {
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

    pages.forEach((raw, pageNumber) => {
        let data = minify(raw, {
            removeTagWhitespace: false,
            collapseInlineTagWhitespace: false,
            collapseWhitespace: true,
        });

        const dataHTML = cheerio.load(data);

        const el = cheerio.load(
            `<section id="page${pageNumber + pageFrom}"></section>`
        );
        const page = el(`#page${pageNumber + pageFrom}`);

        const contents = dataHTML("body").children();

        for (let i = 0; i < contents.length; i++) {
            page.append(bbencode(dataHTML.html(contents.get(i))));
        }

        freeHTML += el("body").html();
    });

    fs.mkdirSync(`./out/${leadup.join("/")}`, { recursive: true });
    fs.writeFileSync(
        `./out/${leadup.join("/")}/${pageFrom}-${pageTo}.html`,
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

/// Recursive function to join paths and convert chats
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

/// Converts a group to HTML
const convertGroup = (file, leadup) => {
    console.log(`Started converting ${file}`);

    const fileData = JSON.parse(fs.readFileSync(file).toString());

    const pageFrom = fileData.from + 1;
    const pageTo = fileData.to;

    const newHTML = cheerio.load(templateHTML);

    let pagerLinks = "";
    for (let i = pageFrom; i <= pageTo; i++) {
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

    for (let i = pageFrom; i <= pageTo; i++) {
        let data = minify(fileData.pages[i - pageFrom], {
            removeTagWhitespace: false,
            collapseInlineTagWhitespace: false,
            collapseWhitespace: true,
        });

        const dataHTML = cheerio.load(data);
        const contents = dataHTML("body").children();

        const el = cheerio.load(`<section id="page${i}"></section>`);
        const page = el(`#page${i}`);

        for (let j = 0; j < contents.length; j++) {
            page.append(bbencode(dataHTML.html(contents.get(j))));
        }

        freeHTML += el("body").html();
    }

    fs.mkdirSync(`./out/${leadup.join("/")}`, { recursive: true });
    fs.writeFileSync(
        `./out/${leadup.join("/")}/${pageFrom}-${pageTo}.html`,
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

/// Recursive function to join paths and convert groups
const convertGroupDeep = (item, leadup = []) => {
    if (fs.statSync(item).isDirectory()) {
        leadup.push(path.basename(item));

        fs.readdirSync(item).forEach((p) =>
            convertGroupDeep(path.join(item, p), leadup)
        );
    } else {
        convertGroup(item, leadup);
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

    fs.readdirSync("./groups").forEach((item) =>
        convertGroupDeep(path.join("./groups", item))
    );

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
