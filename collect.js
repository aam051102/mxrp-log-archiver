const fs = require("fs");
const fetch = require("node-fetch").default;
const cheerio = require("cheerio");

const fails = [];

// Settings
/**
 * Maximum length for HTML
 */
let maxChunkPageCount;

const fetchChatData = async (url, pages) => {
    let sections = [];
    let pageData = [];
    let previousPageChunk = 0;
    let currentPageChunk = 0;

    for (let i = pages; i >= 1; i--) {
        console.log(`Fetching: ${url}/${i}`);

        await fetch(`${url}/${i}`)
            .then((e) => e.text())
            .then(async (data) => {
                const readData = cheerio.load(data);

                const convoWrapper = readData("#conversation_wrap");
                if (!convoWrapper.length) {
                    console.error(`Failed to fetch: ${url}/${i}`);
                    fails.push(`${url}/${i}`);
                    return [];
                }

                const content = convoWrapper.html();

                if (
                    currentPageChunk !== 0 &&
                    currentPageChunk % maxChunkPageCount === 0
                ) {
                    sections.push({
                        from: previousPageChunk,
                        to: currentPageChunk,
                        pages: pageData,
                    });
                    pageData = [];
                    previousPageChunk = currentPageChunk;
                }

                currentPageChunk++;

                pageData.push(content);
            });
    }

    if (pageData.length) {
        sections.push({
            from: previousPageChunk,
            to: currentPageChunk,
            pages: pageData,
        });
    }

    return sections;
};

const fetchGroupData = async (url) => {
    let pageData = [];

    let prevPage = url;

    while (prevPage) {
        console.log(`Fetching: ${prevPage}`);

        await fetch(prevPage)
            .then((e) => e.text())
            .then(async (data) => {
                const readData = cheerio.load(data);

                const convoWrapper = readData("#conversation_wrap");
                if (!convoWrapper.length) {
                    console.error(`Failed to fetch: ${prevPage}`);
                    fails.push(prevPage);
                    prevPage = undefined;
                    return [];
                }

                pageData.push(convoWrapper.html());

                const prevLink = readData(".previous_day a");
                if (prevLink.length) {
                    prevPage = `https://mxrp.chat${prevLink.attr("href")}`;
                } else {
                    prevPage = undefined;
                }
            });
    }

    return pageData;
};

(async () => {
    // Settings
    const settings = fs.existsSync("./settings.json")
        ? JSON.parse(fs.readFileSync("./settings.json"))
        : {};
    maxChunkPageCount = settings.maxChunkPageCount ?? 250;

    // Loading
    if (!fs.existsSync("./input.json")) {
        console.error("MXRP Collector", '"input.json" does not exist.');

        process.stdin.once("data", function () {
            process.exit(1);
        });
        return;
    }

    fs.mkdirSync("./chats", { recursive: true });
    fs.mkdirSync("./groups", { recursive: true });

    const input = JSON.parse(fs.readFileSync("./input.json").toString());

    // Chats
    const chats = input.chats;
    for (let i = 0; i < chats.length; i++) {
        if (!fs.existsSync(`./chats/${chats[i].id}.json`)) {
            const sections = await fetchChatData(
                `https://mxrp.chat/${chats[i].id}/log`,
                chats[i].pages
            );

            fs.mkdirSync(`./chats/${chats[i].id}`);

            for (let j = 0, l = sections.length; j < l; j++) {
                fs.writeFileSync(
                    `./chats/${chats[i].id}/${j}_${sections[j].from}-${sections[j].to}.json`,
                    JSON.stringify(sections[j])
                );
            }
        }
    }

    // Groups
    const groups = input.groups;
    for (let i = 0; i < groups.length; i++) {
        if (!fs.existsSync(`./groups/${groups[i]}.json`)) {
            const data = await fetchGroupData(
                `https://mxrp.chat/${groups[i]}/log`
            );
            if (data.length > 0) {
                fs.writeFileSync(`./groups/${groups[i]}.json`, data.join(""));
            }
        }
    }

    // Log fails
    if (fails.length) console.log("ERRORS DURING LOGGING:");
    fails.forEach((url) => {
        console.error(`- ${url}`);
    });

    console.log(
        '\nSuccessfully ran MXRP Collector. Check "convos" directory for downloaded content and run the MXRP Builder in from this directory to create readable pages.'
    );

    process.stdin.once("data", function () {
        process.exit(0);
    });
})();
