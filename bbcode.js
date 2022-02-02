var $ = require("jquery");

// BBCode
var tag_properties = {
    bgcolor: "background-color",
    color: "color",
    font: "font-family",
    bshadow: "box-shadow",
    tshadow: "text-shadow",
};
function bbencode(text, admin) {
    return raw_bbencode(text, admin);
}
function raw_bbencode(text, admin) {
    // convert BBCode inside [raw] to html escapes to prevent stacking problems and make it show with BBcode disabled
    var re = /\[raw\]([\s\S]*?)\[([\s\S]*?)\]([\s\S]*?)\[\/raw\]/gi;
    while (re.exec(text)) {
        text = text.replace(re, "[raw]$1&#91;$2&#93;$3[/raw]");
    }
    text = text.replace(/(\[[bB][rR]\])+/g, "<br>");

    // Just outright make this match case insensitive so we don't have to worry about tags matching in casing on the \2 callback
    return text.replace(
        /(https?:\/\/\S+)|\[([A-Za-z]+)(?:=([^\]]+))?\]([\s\S]*?)\[\/\2\]/gi,
        function (str, url, tag, attribute, content) {
            if (url) {
                var suffix = "";
                // Exclude a trailing closing bracket if there isn't an opening bracket.
                if (url[url.length - 1] == ")" && url.indexOf("(") == -1) {
                    url = url.substr(0, url.length - 1);
                    suffix = ")";
                }
                url = url
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, '"')
                    .replace(/&#x27;/g, "'"); // re-escape to work with links
                return (
                    $("<a>")
                        .attr({
                            href: "/redirect?url=" + encodeURIComponent(url),
                            target: "_blank",
                        })
                        .text(url)[0].outerHTML + suffix
                );
            }
            tag = tag.toLowerCase();
            if (attribute) {
                switch (tag) {
                    case "bgcolor":
                    case "color":
                        return $("<span>")
                            .css(tag_properties[tag], attribute)
                            .html(raw_bbencode(content, admin))[0].outerHTML;
                    case "font":
                        // Gotta quote the font name so fonts starting with numbers work.
                        return $("<span>")
                            .css(tag_properties[tag], "'" + attribute + "'")
                            .html(raw_bbencode(content, admin))[0].outerHTML;
                    case "bshadow":
                    case "tshadow":
                        return admin
                            ? $("<span>")
                                  .css(tag_properties[tag], attribute)
                                  .html(raw_bbencode(content, admin))[0]
                                  .outerHTML
                            : raw_bbencode(content, admin);
                    case "url":
                        if (
                            attribute.substr(0, 7) == "http://" ||
                            attribute.substr(0, 8) == "https://"
                        ) {
                            attribute = attribute
                                .replace(/&amp;/g, "&")
                                .replace(/&quot;/g, '"')
                                .replace(/&#x27;/g, "'"); // re-escape to work with links
                            return $("<a>")
                                .attr({
                                    href:
                                        "/redirect?url=" +
                                        encodeURIComponent(attribute),
                                    target: "_blank",
                                })
                                .html(raw_bbencode(content, admin))[0]
                                .outerHTML;
                        }
                        break;
                }
            } else {
                switch (tag) {
                    case "b":
                    case "del":
                    case "i":
                    case "sub":
                    case "sup":
                    case "u":
                    case "s":
                        return (
                            "<" +
                            tag +
                            ">" +
                            raw_bbencode(content, admin) +
                            "</" +
                            tag +
                            ">"
                        );
                    case "c":
                        return (
                            '<span style="text-transform: uppercase">' +
                            raw_bbencode(content, admin) +
                            "</span>"
                        );
                    case "w":
                        return (
                            '<span style="text-transform: lowercase">' +
                            raw_bbencode(content, admin) +
                            "</span>"
                        );
                    case "alternian":
                        return (
                            '<span class="alternian">' +
                            raw_bbencode(content, admin) +
                            "</span>"
                        );
                    case "spoiler":
                        return (
                            '<label class="spoiler"><input type="checkbox"><span>SPOILER</span><span>' +
                            raw_bbencode(content, admin) +
                            "</span></label>"
                        );
                    case "raw":
                        return content;
                }
            }
            return (
                "[" +
                tag +
                (attribute ? "=" + attribute : "") +
                "]" +
                raw_bbencode(content, admin) +
                "[/" +
                tag +
                "]"
            );
        }
    );
}

module.exports = bbencode;
