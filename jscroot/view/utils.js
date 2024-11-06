import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js";

export function addNotificationCloseListeners() {
  document.querySelectorAll(".notification .delete").forEach(($delete) => {
    const $notification = $delete.parentNode;
    $delete.addEventListener("click", () => {
      $notification.parentNode.removeChild($notification);
    });
  });
}

export function truncateText(text, maxLength) {
  if (text.length > maxLength) {
    return (
      text.substring(0, maxLength) +
      '... <span class="reveal-text">(more)</span>'
    );
  } else {
    return text;
  }
}

function copyToClipboard(text) {
  const tempInput = document.createElement("input");
  tempInput.style.position = "absolute";
  tempInput.style.left = "-9999px";
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  Swal.fire({
    icon: "success",
    title: "Copied!",
    text: "Text has been copied to clipboard.",
  });
}

export function addRevealTextListeners() {
  document.querySelectorAll(".reveal-text").forEach((element) => {
    element.addEventListener("click", (event) => {
      const fullText = event.target.nextElementSibling;
      const truncatedText = event.target.previousSibling;

      if (fullText.style.display === "none") {
        fullText.style.display = "inline";
        event.target.textContent = " (less)";
        truncatedText.textContent = "";
      } else {
        fullText.style.display = "none";
        event.target.textContent = " (more)";
        truncatedText.textContent =
          fullText.textContent.substring(0, 50) + "...";
      }
    });
  });
}

export function addCopyButtonListeners() {
  document.querySelectorAll(".copy-btn").forEach((element) => {
    element.addEventListener("click", (event) => {
      const textToCopy = event.target.getAttribute("data-copy-text");
      copyToClipboard(textToCopy);
    });
  });
}


