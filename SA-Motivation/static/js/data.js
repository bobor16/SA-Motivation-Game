let climbingData = [];

// Indstil standard dato til i dag
document.getElementById('day').value = new Date().toISOString().split('T')[0]; // Indstil standard til i dag

document.getElementById('getCountButton').addEventListener('click', function() {
    const selectedDay = document.getElementById('day').value; // Hent den valgte dato

    fetch(`/get_climb_count?day=${selectedDay}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('climbCount').textContent = data.total_climbs;
            climbingData.push({ day: selectedDay, count: data.total_climbs });
            updateChart();
            checkAchievements(data.total_climbs); // Tjek achievements
            moveBunny(); // Flyt kaninen, hver gang tælleren opdateres
        })
        .catch(error => {
            console.error('Error fetching climb count:', error);
        });
});

function updateChart() {
    const ctx = document.getElementById('climbingChart').getContext('2d');
    const labels = climbingData.map(data => data.day);
    const counts = climbingData.map(data => data.count);

    if (window.climbingChart instanceof Chart) {
        window.climbingChart.destroy();
    }

    window.climbingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Climbing Count',
                data: counts,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 1500,
                easing: 'easeInOutBounce'
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Funktion til at flytte kaninen (kan tilføjes her eller i progress.js)
function moveBunny() {
    const bunny = document.getElementById('bunny');
    bunny.style.transition = "left 1s ease"; // Juster hastigheden på hoppen
    bunny.style.left = "100%"; // Flyt kaninen til højre

    setTimeout(() => {
        bunny.style.left = "0"; // Tilbage til startposition
    }, 1000); // Tiden for at bevæge sig til højre
}


