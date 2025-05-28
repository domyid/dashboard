import { onClicks, addJS } from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.2.6/element.js";
import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

let pengunjungChartInstance = null;

export async function main() {
    await addJS("https://cdn.jsdelivr.net/npm/chart.js");
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

function loadChart(howLong) {
    const url = `https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/tracker?how_long=${howLong}`;
    getJSON(url, 'login', getCookie('login'), (result) => responseFunction(result, howLong))
};

function handleButtonClick(buttonElement) {
    const range = buttonElement.getAttribute('data-range');
    loadChart(range);
}

function responseFunction(result, howLong) {
    if (result.status == 200) {
        const data = result.data.data;

        if (howLong === "last_day") {
            const nowUTC = new Date();
            const now = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
            const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const pengunjungPerJam = Array(24).fill(0);
            const labels = [];

            for (let i = 0; i < 24; i++) {
                const hour = new Date(startTime.getTime() + i * 60 * 60 * 1000);
                labels.push(hour.getHours().toString().padStart(2, '0') + ':00');
            }

            data.forEach(item => {
                const waktuUTC = new Date(item.tanggal_ambil);
                const waktu = new Date(waktuUTC.getTime() + 7 * 60 * 60 * 1000);

                if (waktu >= startTime && waktu <= now) {
                    const diffMs = waktu - startTime;
                    const jamIndex = Math.floor(diffMs / (60 * 60 * 1000));

                    if (jamIndex >= 0 && jamIndex < 24) {
                        pengunjungPerJam[jamIndex]++;
                    }
                }
            });

            tampilkanChart(labels, pengunjungPerJam);

        } else {
            const pengunjung = {};
            data.forEach(item => {
                const waktuUTC = new Date(item.tanggal_ambil);
                const waktu = new Date(waktuUTC.getTime() + 7 * 60 * 60 * 1000);

                const key = waktu.toISOString().split('T')[0];
                pengunjung[key] = (pengunjung[key] || 0) + 1;
            });

            const allDates = generateDateRange(Object.keys(pengunjung), howLong);
            const labels = allDates;
            const jumlah = allDates.map(tgl => pengunjung[tgl] || 0);

            tampilkanChart(labels, jumlah);
        }
    }
};

function generateDateRange(tanggalArray, howLong) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let start;

    if (howLong === 'last_week') {
        start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (howLong === 'last_month') {
        start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    } else {
        const sortedDates = tanggalArray.sort();
        start = new Date(sortedDates[0]);
        now = new Date(sortedDates[sortedDates.length - 1]);
    }

    const dateList = [];
    while (start <= now) {
        dateList.push(start.toISOString().split('T')[0]);
        start.setDate(start.getDate() + 1);
    }

    return dateList;
};

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