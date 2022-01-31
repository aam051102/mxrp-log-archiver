/**
 * This array contains the main static bbcode
 */
const bbcode = [
    "\\[br]",
    "\\[b](.+?)\\[/b]",
    "\\[i](.+?)\\[/i]",
    "\\[u](.+?)\\[/u]",
    "\\[s](.+?)\\[/s]",
    "\\[ul](.+?)\\[/ul]",
    "\\[li](.+?)\\[/li]",
    "\\[ol](.+?)\\[/ol]",
    "\\[center](.+?)\\[/center]",
    "\\[left](.+?)\\[/left]",
    "\\[right](.+?)\\[/right]",
    "\\[sub](.+?)\\[/sub]",
    "\\[sup](.+?)\\[/sup]",

    "\\[bgcolor=([a-zA-Z]*|#?[0-9a-fA-F]{6})](.+?)\\[\\/bgcolor]",
    "\\[color=([a-zA-Z]*|#?[0-9a-fA-F]{6})](.+?)\\[\\/color]",
    "\\[size=([0-9][0-9]?)](.+?)\\[/size]",
    "\\[quote](\r\n)?(.+?)\\[/quote]",
    "\\[quote=(.*?)](\r\n)?(.+?)\\[/quote]",
    "\\[url](.+?)\\[/url]",
    "\\[url=(.+?)](.+?)\\[\\/url]",
    "\\[email]([w.-]+@[a-zA-Z0-9-]+.?[a-zA-Z0-9-]*.w{1,4})\\[/email]",
    "\\[email=([w.-]+@[a-zA-Z0-9-]+.?[a-zA-Z0-9-]*.w{1,4})](.+)\\[/email]",
    "\\[img](.+?)\\[/img]",
    "\\[img=(.+?)](.+?)\\[/img]",
    "\\[code](\r\n)?(.+?)(\r\n)?\\[/code]",
    "\\[youtube]http://[a-z]{0,3}.youtube.com/watch?v=([0-9a-zA-Z]{1,11})\\[/youtube]",
    "\\[youtube]([0-9a-zA-Z]{1,11})\\[/youtube]",
];

for (let i = 0; i < bbcode.length; i++) {
    bbcode[i] = new RegExp(bbcode[i], "gi");
}

/**
 * This array contains the main static bbcode's html
 */
const html = [
    "<br>",
    "<b>$1</b>",
    "<i>$1</i>",
    "<u>$1</u>",
    "<s>$1</s>",
    "<ul>$1</ul>",
    "<li>$1</li>",
    "<ol>$1</ol>",
    '<div style="text-align: center;">$1</div>',
    '<div style="text-align: left;">$1</div>',
    '<div style="text-align: right;">$1</div>',
    "<sub>$1</sub>",
    "<sup>$1</sup>",

    '<span style="background-color: $1">$2</span>',
    '<span style="color: $1">$2</span>',
    '<span style="font-size: $1px">$2</span>',
    '<div class="quote"><span class="quoteby">Disse:</span>\r\n$2</div>',
    '<div class="quote"><span class="quoteby">Disse <b>$1</b>:</span>\r\n$3</div>',
    '<a rel="nofollow" target="_blank" href="$1">$1</a>',
    '<a rel="nofollow" target="_blank" href="$1">$2</a>',
    '<a href="mailto: $1">$1</a>',
    '<a href="mailto: $1">$2</a>',
    '<img src="$1" alt="$1" />',
    '<img src="$1" alt="$2" />',
    '<div class="code">$2</div>',
    '<object type="application/x-shockwave-flash" style="width: 450px; height: 366px;" data="http://www.youtube.com/v/$1"><param name="movie" value="http://www.youtube.com/v/$1" /><param name="wmode" value="transparent" /></object>',
    '<object type="application/x-shockwave-flash" style="width: 450px; height: 366px;" data="http://www.youtube.com/v/$1"><param name="movie" value="http://www.youtube.com/v/$1" /><param name="wmode" value="transparent" /></object>',
];

/**
 * This function parses BBcode tag to HTML code (XHTML transitional 1.0)
 *
 * It parses (only if it is in valid format e.g. an email must to be
 * as example@example.ext or similar) the text with BBcode and
 * translates in the relative html code.
 *
 * @param string text
 * @returns string
 */
function parseBBCode(text) {
    for (let i = 0; i < bbcode.length; i++) {
        text = text.replace(bbcode[i], html[i]);
    }

    return text;
}

module.exports = parseBBCode;
