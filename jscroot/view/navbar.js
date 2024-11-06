import {id} from "../url/config.js";

export function main(){
    showMenu('header-toggle',id.navbar);
    activeLink('.nav__link');
    activeLink('.nav__dropdown-item');
}

/*==================== SHOW NAVBAR ====================*/
function showMenu(headerToggle, navbarId){
    const toggleBtn = document.getElementById(headerToggle);
    const nav = document.getElementById(navbarId);
    
    // Validate that variables exist
    if(headerToggle && navbarId){
        toggleBtn.addEventListener('click', ()=>{
            // We add the show-menu class to the div tag with the nav__menu class
            nav.classList.toggle('show-menu')
            // change icon
            toggleBtn.classList.toggle('bx-x')
        })
    }

}

/*==================== LINK ACTIVE ====================*/
function activeLink(className){//'.nav__link'
    const linkColor = document.querySelectorAll(className);
    linkColor.forEach(l => {l.addEventListener('click', function() { 
        linkColor.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    } );});
}

/*==================== LOGOUT LOGIC ====================*/
const logoutButton = document.querySelector(".nav__logout");

if (logoutButton) {
  logoutButton.addEventListener("click", function (event) {
    event.preventDefault();
    Cookies.remove("login", {
      path: "/",
    });
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out",
      showConfirmButton: false,
      timer: 2000,
    }).then(() => {
      window.location.href = "/";
    });
  });
}


