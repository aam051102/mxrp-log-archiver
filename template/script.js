const params = new URLSearchParams(window.location.search);
let page = parseInt(params.get("p")) || 1;

document.addEventListener("DOMContentLoaded", () => {
    const archiveConversation_DOM = document.querySelector("#archive_conversation");
    const topPager_DOM = document.querySelector(".pager");
    const pagers_DOM = document.querySelectorAll(".pager a");

    // Create first and last ..
    const createDots = () => {
        const etcElement = document.createElement("span");
        etcElement.textContent = "..";
        etcElement.style.marginRight = "0.5em";

        return etcElement;
    };

    const lastEl = (pagers_DOM.length - 2) / 2;
    
    if(pagers_DOM[0].nextSibling) pagers_DOM[0].parentNode.insertBefore(createDots(), pagers_DOM[0].nextSibling);
    if(pagers_DOM[0].nextSibling != pagers_DOM[lastEl]) pagers_DOM[0].parentNode.insertBefore(createDots(), pagers_DOM[lastEl]);

    if(pagers_DOM[lastEl + 1].nextSibling) pagers_DOM[lastEl + 1].parentNode.insertBefore(createDots(), pagers_DOM[lastEl + 1].nextSibling);
    if(pagers_DOM[pagers_DOM.length - 1].nextSibling != pagers_DOM[pagers_DOM.length - 1]) pagers_DOM[lastEl + 1].parentNode.insertBefore(createDots(), pagers_DOM[pagers_DOM.length - 1]);

    // Shorten page selectors
    const updatePagers = () => {
        const aroundPage = topPager_DOM.clientWidth / (16 * 4);

        if(page - aroundPage - 1 < 1) {
            document.querySelectorAll(".pager span:first-of-type").forEach((el) => {el.style.display = "none"});
        } else {
            document.querySelectorAll(".pager span:first-of-type").forEach((el) => {el.style.display = "initial"});
        }

        if(page + aroundPage >= lastEl) {
            document.querySelectorAll(".pager span:last-of-type").forEach((el) => {el.style.display = "none"});
        } else {
            document.querySelectorAll(".pager span:last-of-type").forEach((el) => {el.style.display = "initial"});
        }

        for(let i = 0; i < pagers_DOM.length; i++) {
            const element = pagers_DOM[i];

            if (
                element.parentNode.firstChild !== element &&
                element.parentNode.lastChild !== element
            ) {
                const elementHref = element.getAttribute("href");
                const elementPage = parseInt(
                    elementHref.replace("?p=", "")
                );

                if (elementPage > page + aroundPage || elementPage < page - aroundPage) {
                    element.style.display = "none";
                } else {
                    element.style.display = "initial";
                }
            }
        }
    };

    window.addEventListener("resize", () => {
        updatePagers();
    });

    // Show page
    const updatePage = () => {
        archiveConversation_DOM.scrollTop = 0;

        document.querySelectorAll(`.pager a[href="?p=${page}"]`).forEach(el => el.classList.add("current"));
        document.querySelector(`#page${page}`).classList.add("current");

        updatePagers();
    };
    updatePage();

    // Quick links
    document.addEventListener("click", (e) => {
        if(e.target.parentNode && e.target.parentNode.classList && e.target.parentNode.classList.contains("pager")) {
            e.preventDefault();

            const elementHref = e.target.getAttribute("href");
            const elementPage = parseInt(
                elementHref.replace("?p=", "")
            );

            const visiblePage = document.querySelector(`#page${page}.current`);
            if(visiblePage) visiblePage.classList.remove("current");

            document.querySelectorAll(`.pager a[href="?p=${page}"].current`).forEach(el => el.classList.remove("current"));

            page = elementPage;
            updatePage();
            window.history.pushState("", "", elementHref);
        }
    });
});
