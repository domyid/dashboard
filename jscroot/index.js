//lib call
import {addCSS} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import { insertHTML } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.4/croot.js";
import {onHashChange} from "https://cdn.jsdelivr.net/gh/jscroot/url@0.0.4/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {redirect} from "https://cdn.jsdelivr.net/gh/jscroot/url@0.0.9/croot.js";
//internal call
import { url,id } from "./url/config.js";
import { getContentURL } from "./url/content.js";
import {runAfterHeader,runAfterContent,runAfterHashChange} from "./controller/main.js";


//check cookie login
if (getCookie("login")===""){
    redirect("/signin");
}

//adding CSS
addCSS("https://unpkg.com/bulma@0.9.4/css/bulma.min.css");
addCSS("https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css");
addCSS("https://cdn.jsdelivr.net/npm/boxicons@latest/css/boxicons.min.css");
addCSS("https://cdn.datatables.net/2.0.8/css/dataTables.dataTables.min.css");
addCSS("assets/css/styles.css");

//rendering HTML
insertHTML(url.template.header,id.header,runAfterHeader);
insertHTML(getContentURL(),id.content,runAfterContent);
onHashChange(runAfterHashChange);


