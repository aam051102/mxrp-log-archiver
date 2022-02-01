const fs = require("fs");
const fetch = require("node-fetch").default;
const cheerio = require("cheerio");

const fails = [];

const fetchChatData = async (url, pages) => {
    let pageData = [];

    for (let i = pages; i >= 1; i--) {
        console.log(`Fetching: ${url}/${i}`);

        await fetch(`${url}/${i}`)
            .then((e) => e.text())
            .then(async (data) => {
                const readData = cheerio.load(data);

                const convoWrapper = readData("#conversation_wrap");
                if (!convoWrapper.length) {
                    console.error(`Failed to fetch: ${url}`);
                    fails.push(url);
                    return [];
                }

                pageData.push(convoWrapper.html());
            });
    }

    return pageData;
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
    if (!fs.existsSync("./input.json")) {
        console.error("MXRP Builder", '"input.json" does not exist.');

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
            const data = await fetchChatData(
                `https://mxrp.chat/${chats[i].id}/log`,
                chats[i].pages
            );
            if (data.length > 0) {
                fs.writeFileSync(
                    `./chats/${chats[i].id}.json`,
                    JSON.stringify(data)
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
    console.log("LOGGING FAILS:");
    fails.forEach((url) => {
        console.error(`- ${url}`);
    });

    console.log(
        'Successfully ran MXRP Collector. Check "convos" directory for downloaded content and run the MXRP Builder in from this directory to create readable pages.'
    );

    process.stdin.once("data", function () {
        process.exit(0);
    });
})();
