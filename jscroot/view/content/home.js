import {
  addCSSIn,
  setValue,
  setInner,
  addChild,
} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.8/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {
  getJSON,
  putJSON,
  postJSON,
} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.8/croot.js";
import { id, backend } from "../../url/config.js";

let tableTemplate = `
<td width="5%"><i class="fa fa-bell-o"></i></td>
<td>#TASKNAME#</td>
<td class="level-right">
<button class="button is-small is-primary" data-item="#TASKID#">#LABEL#</button>
</td>
`;

export async function main() {
  await addCSSIn("assets/css/admin.css", id.content);
  getJSON(backend.user.data, "login", getCookie("login"), getUserFunction);
  getJSON(backend.user.todo, "login", getCookie("login"), getUserTaskFunction);
  getJSON(
    backend.user.doing,
    "login",
    getCookie("login"),
    getUserDoingFunction
  );
  getJSON(backend.user.done, "login", getCookie("login"), getUserDoneFunction);
}

function getUserFunction(result) {
  if (result.status !== 404) {
    const roundedPoin = Math.round(result.data.poin);
    setInner("biggreet", "Halo " + result.data.name);
    setInner(
      "subtitle",
      "Jumlah rollup sprint point kamu saat ini sebesar " +
        roundedPoin +
        " poin."
    );
    setInner("bigpoin", roundedPoin);
  } 
  else {
    redirect("/signup");
  }
}

function getUserTaskFunction(result) {
  setInner("list", "");
  setInner("bigtodo", "0");
  if (result.status === 200) {
    setInner("bigtodo", result.data.length.toString());
    result.data.forEach(isiTaskList);
  }
}

function isiTaskList(value) {
  let content = tableTemplate
    .replace("#TASKNAME#", value.task)
    .replace("#TASKID#", value._id)
    .replace("#LABEL#", "Ambil");
  addChild("list", "tr", "", content);
  // Jalankan logika tambahan setelah addChild
  runAfterAddChild(value);
}

function runAfterAddChild(value) {
  // Temukan elemen tr yang baru saja ditambahkan
  const rows = document.getElementById("list").getElementsByTagName("tr");
  const lastRow = rows[rows.length - 1];

  // Contoh: Tambahkan event listener atau manipulasi DOM lainnya
  const button = lastRow.querySelector(".button");
  if (button) {
    button.addEventListener("click", () => {
      putJSON(
        backend.user.doing,
        "login",
        getCookie("login"),
        { _id: value._id },
        putTaskFunction
      );
    });
  }
}

function putTaskFunction(result) {
  if (result.status === 200) {
    getJSON(
      backend.user.todo,
      "login",
      getCookie("login"),
      getUserTaskFunction
    );
    getJSON(
      backend.user.doing,
      "login",
      getCookie("login"),
      getUserDoingFunction
    );
  }
}

function getUserDoingFunction(result) {
  setInner("doing", "");
  setInner("bigdoing", "0");
  if (result.status === 200) {
    setInner("bigdoing", "OTW");
    let content = tableTemplate
      .replace("#TASKNAME#", result.data.task)
      .replace("#TASKID#", result.data._id)
      .replace("#LABEL#", "Beres");
    addChild("doing", "tr", "", content);
    // Jalankan logika tambahan setelah addChild
    runAfterAddChildDoing(result.data);
  }
}

function runAfterAddChildDoing(value) {
  // Temukan elemen tr yang baru saja ditambahkan
  const rows = document.getElementById("doing").getElementsByTagName("tr");
  const lastRow = rows[rows.length - 1];

  // Contoh: Tambahkan event listener atau manipulasi DOM lainnya
  const button = lastRow.querySelector(".button");
  if (button) {
    button.addEventListener("click", () => {
      postJSON(
        backend.user.done,
        "login",
        getCookie("login"),
        { _id: value._id },
        postTaskFunction
      );
    });
  }
}

function postTaskFunction(result) {
  if (result.status === 200) {
    getJSON(
      backend.user.done,
      "login",
      getCookie("login"),
      getUserDoneFunction
    );
    getJSON(
      backend.user.doing,
      "login",
      getCookie("login"),
      getUserDoingFunction
    );
  }
}

function getUserDoneFunction(result) {
  setInner("done", "");
  setInner("bigdone", "0");
  if (result.status === 200) {
    setInner("bigdone", "OK");
    let content = tableTemplate
      .replace("#TASKNAME#", result.data.task)
      .replace("#TASKID#", result.data._id)
      .replace("#LABEL#", "Arsip");
    addChild("done", "tr", "", content);
  }
}
