document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");

    const dayInput = document.getElementById('day');
    dayInput.value = new Date().toISOString().split('T')[0];

    const setGoalButton = document.getElementById('setGoalButton');
    let climbingData = [];
    const bunny = document.getElementById('bunny');
    let bunnyPosition = 0;
    const moveSpeed = 50;
    let lastClimbCount = 0;
    let currentGoal = 20; // Default mål, hvis der ikke er et mål for dagen i databasen

    // Automatisk hent data for i dag
    fetchClimbAndGoal(dayInput.value);
    loadTotalClimbs(); // Ny funktion til at hente total klatringer

    // Start interval for at tjekke klatredata hvert 5. sekund
    setInterval(() => {
        fetchClimbAndGoal(dayInput.value);
    }, 5000); // Opdater hvert 5000 ms (5 sekunder)

    // Tilføj event listener for at ændre dato
    dayInput.addEventListener('change', function() {
        const selectedDay = dayInput.value;
        fetchClimbAndGoal(selectedDay);
    });

    // Tilføj event listener for at sætte mål
    setGoalButton.addEventListener('click', function() {
        const goal = parseInt(document.getElementById('goalInput').value);
        currentGoal = goal;
        setAchievements(goal);

        // Gem det nye mål for den valgte dag
        const selectedDay = dayInput.value;
        saveGoalForDay(selectedDay, goal);

        fetchClimbAndGoal(selectedDay);
    });

    // redeemPoints funktionen
    async function redeemPoints() {
        try {
            // Send request to redeem points
            const response = await fetch('/redeem_points', { method: 'POST' });
            
            if (response.ok) {
                const data = await response.json();
                // Opdater totalClimbs og pointsValue til 0
                document.getElementById('totalClimbs').innerText = '0';
                document.getElementById('pointsValue').innerText = '0'; // Points resettes
                alert(data.message);
            } else {
                alert('Failed to redeem points.');
            }
        } catch (error) {
            console.error('Error redeeming points:', error);
        }
    }

    document.getElementById('redeemButton').addEventListener('click', redeemPoints);

    // Funktion til at hente total klatringer
    async function loadTotalClimbs() {
        try {
            const response = await fetch('/get_total_climbs');
            if (response.ok) {
                const data = await response.json();
                document.getElementById('totalClimbs').innerText = data.total_climbs; // Opdater total climbs
                document.getElementById('pointsValue').innerText = data.total_climbs; // Opdater points
            } else {
                console.error('Failed to fetch total climbs.');
            }
        } catch (error) {
            console.error('Error loading total climbs:', error);
        }
    }

function fetchClimbAndGoal(selectedDay) {
    console.log("Fetching climb count and goal for selected day:", selectedDay);
    
    fetch(`/get_climb_and_goal?day=${selectedDay}`)
        .then(response => response.json())
        .then(data => {
            const climbCountElement = document.getElementById('climbCount');
            const totalClimbs = data.total_climbs || 0; // Default til 0 hvis undefined
            if (climbCountElement) {
                climbCountElement.textContent = totalClimbs;
            }

            // Opdater det gemte mål for dagen
            if (data.goal !== undefined) { // Kontroller for undefined
                currentGoal = data.goal; // Brug målet fra databasen
                document.getElementById('goalInput').value = data.goal;
                setAchievements(data.goal);
            } else {
                console.log("No goal found for the selected day, using default goal.");
                setAchievements(currentGoal);
            }

            console.log("Climb count:", totalClimbs);
            console.log("Current goal:", currentGoal);
            updateProgress(totalClimbs);

            if (totalClimbs > lastClimbCount) {
                const newClimbs = totalClimbs - lastClimbCount;
                for (let i = 0; i < newClimbs; i++) {
                    moveBunny();
                }
            }

            lastClimbCount = totalClimbs;
            climbingData.push({ day: selectedDay, count: totalClimbs });
        })
        .catch(error => {
            console.error('Error fetching climb count and goal:', error);
        });
}


    function saveGoalForDay(day, goal) {
        fetch('/save_goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ day: day, goal: goal })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save goal');
            }
            return response.json();
        })
        .then(data => {
            console.log("Goal saved successfully for", day);
        })
        .catch(error => {
            console.error('Error saving goal:', error);
        });
    }

    const resetCountButton = document.getElementById('resetCountButton');

    resetCountButton.addEventListener('click', function() {
        const selectedDay = dayInput.value;
        resetClimbCount(selectedDay);
    });

    function resetClimbCount(day) {
        fetch('/reset_count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ day: day })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to reset count');
            }
            return response.json();
        })
        .then(data => {
            console.log("Count reset successfully for", day);
            bunnyPosition = 0;
            bunny.style.transform = `translateX(${bunnyPosition}px)`;
            lastClimbCount = 0; // Reset last climb count in the JS
            updateProgress(0); // Update progress bar to show 0
            fetchClimbAndGoal(day); // Refresh climb and goal data
        })
        .catch(error => {
            console.error('Error resetting count:', error);
        });
    }

    function setAchievements(goal) {
        const bronzeThreshold = Math.max(1, Math.ceil(goal * 0.3));
        const silverThreshold = Math.floor(goal * 0.7);
        const goldThreshold = goal;

        document.getElementById('bronzeLabel').textContent = `${bronzeThreshold} Climbs for Bronze`;
        document.getElementById('silverLabel').textContent = `${silverThreshold} Climbs for Silver`;
        document.getElementById('goldLabel').textContent = `${goldThreshold} Climbs for Gold`;

        updateProgress(0); // Sæt progress til 0, når et nyt mål sættes
    }

    function updateProgress(count) {
        if (currentGoal === undefined || currentGoal <= 0) {
            console.error('Current goal is not defined or invalid:', currentGoal);
            return; // Stop funktionen hvis målet er ugyldigt
        }
        
        const progressPercentage = Math.min((count / currentGoal) * 100, 100);
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;

        const bronzeThreshold = Math.floor(currentGoal * 0.3);
        const silverThreshold = Math.floor(currentGoal * 0.7);
        const goldThreshold = currentGoal;

        document.getElementById('progressBar').textContent = `${count} / ${currentGoal}`;

        checkAchievements(count, bronzeThreshold, silverThreshold, goldThreshold);
    }

    function checkAchievements(count, bronze, silver, gold) {
        const achievementsDiv = document.getElementById('achievements');
        let achievements = '';

        if (count >= bronze && count > 0) {
            achievements += '<img src="/static/badges/bronze.png" alt="Bronze Achievement" />';
        }
        if (count >= silver) {
            achievements += '<img src="/static/badges/silver.png" alt="Silver Achievement" />';
        }
        if (count >= gold) {
            achievements += '<img src="/static/badges/gold.png" alt="Gold Achievement" />';
        }

        achievementsDiv.innerHTML = achievements;
    }

    function moveBunny() {
        const bunnyContainer = document.getElementById('bunnyContainer');
        const containerWidth = bunnyContainer.clientWidth;
        const bunnyWidth = bunny.clientWidth;

        bunnyPosition += containerWidth / currentGoal; // Beregn afstand til at tage en omgang baseret på målet

        if (bunnyPosition > containerWidth) {
            bunnyPosition = 0; // Hvis kaninen når enden, reset til start
        }

        bunny.style.transform = `translateX(${bunnyPosition}px)`;
    }
});

