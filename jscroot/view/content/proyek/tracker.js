import { onClicks } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.2.6/element.js";
import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

let pengunjungChartInstance = null;

export async function main() {
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    getJSON(backend.project.data, 'login', getCookie('login'), getResponseFunction);
    onClicks('tombol-tracker', handleButtonClick);
    loadChart("last_day");
}

function getResponseFunction(result) {
    if (result.status === 200) {
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = project.name;
            document.getElementById('project-name').appendChild(option);
        });

    } else {
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response,
        });
    }
}

// function loadChart(howLong) {
//     const url = `https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/tracker?how_long=${howLong}`;
//     getJSON(url, 'login', getCookie('login'), responseFunction)
// };

function loadChart(howLong) {
    const url = `https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/tracker/testing?how_long=${howLong}`;
    postBiasa(url, {}, responseFunction);
};

function handleButtonClick(buttonElement) {
    const range = buttonElement.getAttribute('data-range');
    loadChart(range);
}

function responseFunction(result) {
    if (result.status == 200) {
        const data = result.data.data;
        const pengunjungPerHari = {};

        data.forEach(item => {
            const tanggal = new Date(item.tanggal_ambil).toISOString().split('T')[0];
            pengunjungPerHari[tanggal] = (pengunjungPerHari[tanggal] || 0) + 1;
        });

        const allDates = generateDateRange(Object.keys(pengunjungPerHari));

        const jumlah = allDates.map(tgl => pengunjungPerHari[tgl] || 0);

        tampilkanChart(allDates, jumlah);
    }
};

function generateDateRange(tanggalArray) {
    const sortedDates = tanggalArray.sort();
    const start = new Date(sortedDates[0]);
    const end = new Date(sortedDates[sortedDates.length - 1]);
    const dateList = [];

    while (start <= end) {
        dateList.push(start.toISOString().split('T')[0]);
        start.setDate(start.getDate() + 1);
    }

    return dateList;
}

function tampilkanChart(labels, data) {
    const ctx = document.getElementById('pengunjungChart').getContext('2d');

    if (pengunjungChartInstance !== null) {
        pengunjungChartInstance.destroy();
    }

    pengunjungChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Pengunjung',
                data: data,
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
};

function postBiasa(target_url, datajson, responseFunction) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    var raw = JSON.stringify(datajson);

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(target_url, requestOptions)
        .then(response => {
            const status = response.status;
            return response.text().then(result => {
                const parsedResult = JSON.parse(result);
                responseFunction({ status, data: parsedResult });
            });
        })
        .catch(error => console.log('error', error));
};