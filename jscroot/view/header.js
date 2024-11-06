//lib call
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { redirect } from "https://cdn.jsdelivr.net/gh/jscroot/url@0.0.9/croot.js";
import { setInner } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";

//internal call
import { backend } from "../url/config.js";

export function main() {
   getJSON(backend.user.data, "login", getCookie("login"), getUserFunction);
}

function getUserFunction(result) {
  if (result.status !== 404) {
    const { name, poin } = result.data;
    if (poin) {
      const roundedPoin =  Math.round(poin)
      setInner("headerlogoname", name);
      setInner("userPoint", roundedPoin);
    } else {
      setInner("headerlogoname", name);
    }
    // Simpan ke localStorage
    localStorage.setItem("nama", name);
  } 
  else {
    redirect("/signup");
  }
}
