document.addEventListener('DOMContentLoaded', function () {
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

    // Start interval for at tjekke klatredata hvert 5. sekund
    setInterval(() => {
        fetchClimbAndGoal(dayInput.value);
    }, 5000); // Opdater hvert 5000 ms (5 sekunder)

    // Tilføj event listener for at ændre dato
    dayInput.addEventListener('change', function () {
        const selectedDay = dayInput.value;
        resetBunnyPosition();  // Nulstil kaninens position, når datoen ændres
        fetchClimbAndGoal(selectedDay);
    });

    // Tilføj event listener for at sætte mål
    setGoalButton.addEventListener('click', function () {
        const goal = parseInt(document.getElementById('goalInput').value);
        currentGoal = goal;
        setAchievements(goal);

        // Gem det nye mål for den valgte dag
        const selectedDay = dayInput.value;
        saveGoalForDay(selectedDay, goal);

        fetchClimbAndGoal(selectedDay);
    });

    function fetchClimbAndGoal(selectedDay) {
        console.log("Fetching climb count and goal for selected day:", selectedDay);

        fetch(`/get_climb_and_goal?day=${selectedDay}`)
            .then(response => response.json())
            .then(data => {
                const climbCountElement = document.getElementById('climbCount');
                if (climbCountElement) {
                    climbCountElement.textContent = data.total_climbs || 0;
                }

                // Opdater det gemte mål for dagen
                if (data.goal) {
                    currentGoal = data.goal;
                    document.getElementById('goalInput').value = data.goal;
                    setAchievements(data.goal);
                } else {
                    console.log("No goal found for the selected day, using default goal.");
                    setAchievements(currentGoal);
                }

                // Nulstil kaninens position og flyt den baseret på den aktuelle klatretæller
                resetBunnyPosition();
                if (data.total_climbs > 0) {
                    for (let i = 0; i < data.total_climbs; i++) {
                        moveBunny(data.total_climbs); // Flyt kaninen i forhold til klatretallet
                    }
                }

                lastClimbCount = data.total_climbs;
                climbingData.push({ day: selectedDay, count: data.total_climbs });

                updateProgress(data.total_climbs);
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

    function setAchievements(goal) {
        const bronzeThreshold = Math.floor(goal * 0.3);
        const silverThreshold = Math.floor(goal * 0.7);
        const goldThreshold = goal;

        document.getElementById('bronzeLabel').textContent = `${bronzeThreshold} Climbs for Bronze`;
        document.getElementById('silverLabel').textContent = `${silverThreshold} Climbs for Silver`;
        document.getElementById('goldLabel').textContent = `${goldThreshold} Climbs for Gold`;

        updateProgress(0); // Sæt progress til 0, når et nyt mål sættes
    }

    function updateProgress(count) {
        const progressPercentage = Math.min((count / currentGoal) * 100, 100);
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;

        const bronzeThreshold = Math.floor(currentGoal * 0.3);
        const silverThreshold = Math.floor(currentGoal * 0.7);
        const goldThreshold = currentGoal;

        // Opdater progress tekst
        document.getElementById('progressBar').textContent = `${count} / ${currentGoal}`;

        checkAchievements(count, bronzeThreshold, silverThreshold, goldThreshold);
    }

    function checkAchievements(count, bronze, silver, gold) {
        const achievementsDiv = document.getElementById('achievements');
        let achievements = '';

        // if goal or climb count is 0, there shall be no medals.
        if (currentGoal === 0 || count === 0) {
            achievementsDiv.innerHTML = achievements;
            return;
        }

        // Show medals only if achieved

        switch (true) {
            case (count >= gold):
                achievements += '<img class="achievement" src="/static/badges/gold.png" alt="Gold Achievement" />';
                break;
            case (count >= silver):
                achievements += '<img class="achievement" src="/static/badges/silver.png" alt="Silver Achievement" />';
                break;
            case (count >= bronze):
                achievements += '<img class="achievement" src="/static/badges/bronze.png" alt="Bronze Achievement" />';
                break;
            default:
                achievements = '';
                break;
        }
        achievementsDiv.innerHTML = achievements;
    }

    const resetCountButton = document.getElementById('resetCountButton');

    resetCountButton.addEventListener('click', function () {
        const selectedDay = dayInput.value;
        resetClimbCount(selectedDay);
    });

    function resetClimbCount() {
        fetch('/reset_count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ day: dayInput.value })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to reset climb count');
                }
                return response.json();
            })
            .then(data => {
                console.log("Climb count reset successfully for", dayInput.value);
                resetBunnyPosition(); // Nulstil kaninen ved nulstilling af klatretælleren
                lastClimbCount = 0;
                updateProgress(0);
            })
            .catch(error => {
                console.error('Error resetting climb count:', error);
            });
    }

    function resetBunnyPosition() {
        bunnyPosition = 0;
        bunny.style.transform = `translateX(${bunnyPosition}px)`;
    }

    function moveBunny(climbCount) {
        const bunnyContainer = document.getElementById('bunnyContainer');
        const containerWidth = bunnyContainer.clientWidth;
        const bunnyWidth = bunny.clientWidth;
        const house = document.getElementById('bunnyhouse');
        const houseWidth = house.clientWidth;
        // Flyt kaninen i forhold til mål og klatretæller
        bunnyPosition = (climbCount / currentGoal) * (containerWidth - houseWidth);

        if (bunnyPosition > containerWidth) {
            bunnyPosition = containerWidth;
        }

        bunny.style.transform = `translateX(${bunnyPosition}px)`;
    }
});
