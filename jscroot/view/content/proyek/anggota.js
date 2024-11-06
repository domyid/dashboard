import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js";
import { id, backend } from "/dashboard/jscroot/url/config.js";
import { loadScript } from "../../../controller/main.js";
import { addNotificationCloseListeners, truncateText, addCopyButtonListeners, addRevealTextListeners } from "../../utils.js";

export async function main() {
  await addCSSIn(
    "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",
    id.content
  );
  await addCSSIn("assets/css/custom.css", id.content);

  await loadScript("https://code.jquery.com/jquery-3.6.0.min.js");
  await loadScript("https://cdn.datatables.net/2.0.8/js/dataTables.min.js");

  getJSON(
    backend.project.anggota,
    "login",
    getCookie("login"),
    getResponseFunction
  );

  addNotificationCloseListeners();
}

function getResponseFunction(result) {
  if (result.status === 200) {
    // Menambahkan baris untuk setiap webhook dalam data JSON
    result.data.forEach((webhook) => {
      const row = document.createElement("tr");
      const truncatedDescription = truncateText(webhook.description, 50);
      row.innerHTML = `
                <td>${webhook.name}</td>
                <td class="code-box">
                  <code>       
                    ${webhook.secret}
                  </code>
                  <a class="tag is-link copy-btn" data-copy-text="${webhook.secret}">Copy</a>
                </td>
                <td class="code-box">
                  <code>                 
                    https://api.do.my.id/webhook/[githost]/${webhook.name}
                  </code>
                  <a class="tag is-link copy-btn" data-copy-text="https://api.do.my.id/webhook/[githost]/${webhook.name}">Copy</a> 
                </td>
                <td>${truncatedDescription}<span class="full-text" style="display:none; ">${webhook.description}</span></td>
            `;
      document.getElementById("webhook-table-body").appendChild(row);
    });

    $(document).ready(function () {
      $("#myTable").DataTable({
        responsive: true,
        autoWidth: false,
      });
    });

     addRevealTextListeners();
     addCopyButtonListeners();
  } else {
    Swal.fire({
      icon: "error",
      title: result.data.status,
      text: result.data.response,
    });
  }
}