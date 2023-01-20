const fs = require("fs");
const fetch = require("node-fetch").default;
const cheerio = require("cheerio");

const fails = [];

// Settings
/**
 * Maximum length for HTML
 */
let maxChunkPageCount;

const fetchChatData = async (chatId, pages) => {
    const url = `https://mxrp.chat/${chatId}/log`;

    let pageData = [];
    let previousPageChunk = pages;
    let currentPageChunk = pages;

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

                if (previousPageChunk - currentPageChunk >= maxChunkPageCount) {
                    fs.writeFileSync(
                        `./chats/${chatId}/${currentPageChunk}-${previousPageChunk}.json`,
                        JSON.stringify(pageData)
                    );

                    pageData = [];
                    previousPageChunk = currentPageChunk;
                }

                currentPageChunk--;

                pageData.push(content);
            });
    }

    if (pageData.length) {
        fs.writeFileSync(
            `./chats/${chatId}/${currentPageChunk}-${previousPageChunk}.json`,
            JSON.stringify(pageData)
        );
    }
};

const fetchGroupData = async (groupId) => {
    const url = `https://mxrp.chat/${groupId}/log`;

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

    return pageData.reverse();
};

(async () => {
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

    maxChunkPageCount = input.maxChunkPageCount ?? 250;

    // Chats
    const chats = input.chats;
    for (let i = 0; i < chats.length; i++) {
        if (!fs.existsSync(`./chats/${chats[i].id}`)) {
            fs.mkdirSync(`./chats/${chats[i].id}`);

            await fetchChatData(chats[i].id, chats[i].pages);
        }
    }

    // Groups
    const groups = input.groups;
    for (let i = 0; i < groups.length; i++) {
        if (!fs.existsSync(`./groups/${groups[i]}`)) {
            fs.mkdirSync(`./groups/${groups[i]}`, { recursive: true });

            const data = await fetchGroupData(groups[i]);

            let from = 0;
            let to = Math.min(data.length - 1, from + maxChunkPageCount);

            while (from !== to) {
                fs.writeFileSync(
                    `./groups/${groups[i]}/${from}-${to}.json`,
                    JSON.stringify({
                        pages: data.slice(from, to),
                        from,
                        to,
                    })
                );

                from = Math.min(data.length, from + maxChunkPageCount);
                to = Math.min(data.length, from + maxChunkPageCount);
            }
        }
    }

    // Log fails
    if (fails.length) console.log("ERRORS DURING LOGGING:");
    fails.forEach((url) => {
        console.error(`- ${url}`);
    });

    console.log(
        '\nSuccessfully ran MXRP Collector. Check "chats" and "groups" directory to see the downloaded content. To convert them to a readable format, run the MXRP Builder from the same directory that you ran the MXRP Collector.'
    );

    process.stdin.once("data", function () {
        process.exit(0);
    });
})();
