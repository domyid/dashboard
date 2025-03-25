//lib call
import {folderPath} from "https://cdn.jsdelivr.net/gh/jscroot/url@0.0.9/croot.js";
//please always use trailing slash(/) for folder or extension for file.
//never use slash in front of file or directory
//u might change croot parameter based on your path

export const backend={
    user:{
        data:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/user",
        todo:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/user/task/todo",
        doing:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/user/task/doing",
        done:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/user/task/done",
        pomokit:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/report/pomokit/total",
    },
    wa:{
        text:"https://api.wa.my.id/api/v2/send/message/text",
        device:"https://api.wa.my.id/api/device/",
    },
    project:{
        data:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/proyek",
        anggota:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/proyek/anggota",
        assessment:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/data/proyek/assessment",
    },
    ux:{
        feedback:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/notif/ux/postfeedback",
        laporan:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/notif/ux/postlaporan",
        rating:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/notif/ux/rating",
        meeting:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/notif/ux/postmeeting",
    },
    tracker:{
        data:"https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/ambildatatracker",
    }
}

export const croot = folderPath()+"jscroot/";

export const folder={
    template:croot+"template/",
    controller : croot+"controller/",
    view : croot+"view/",
}

export const url={
    template:{
        content : folder.template+"content/",
        header: folder.template+"header.html",
        navbar:folder.template+"navbar.html" ,
        settings:folder.template+"settings.html" ,
        sidebar:folder.template+"sidebar.html" ,
        footer:folder.template+"footer.html", 
        rightbar:folder.template+"rightbar.html"
    },
    controller:{
        main : folder.controller+"main.js",
        navbar : folder.controller+"navbar.js"
    },
    view : {
        content:folder.view+"content/",
        header: folder.view+"header.js",
        search:folder.view+"search.js" ,
        settings:folder.view+"settings.js" ,
        navbar:folder.view+"navbar.js" ,
        footer:folder.view+"footer.js" 
    }
}

export const id={
    header:"header__container",
    navbar:"navbar",
    content:"content"
}