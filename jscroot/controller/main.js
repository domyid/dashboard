//lib call
import { insertHTML } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";

//internal call
import { url,id } from "../url/config.js";
import { getContentURL,getURLContentJS } from "../url/content.js";


export function runAfterHashChange(evt){
    insertHTML(getContentURL(),id.content,runAfterContent);
}

export async function runAfterHeader(){
    let module = await import(url.view.header);
    module.main();
    insertHTML(url.template.navbar,id.navbar,runAfterNavbar);
}

async function runAfterNavbar(){
    let module = await import(url.view.navbar);
    module.main();
}

export async function runAfterContent(){
    let urljs = getURLContentJS();
    let module = await import(urljs);
    module.main();
    console.log(urljs);
}

export async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
