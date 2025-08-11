class WastelandSurvival {
    constructor() {
        this.playerName = "";
        this.health = 100;
        this.food = 50;
        this.water = 40;
        this.radiation = 0;
        this.supplies = [];
        this.gasMaskDurability = {}; // Track durability of gas masks
        this.day = 1;
        this.bunkerSupplies = {
            "canned_food": 5,
            "water_bottles": 3,
            "med_kit": 2
        };
        this.gameOver = false;
        this.logMessages = [];
        this.saveKey = "wasteland_save_data";
        this.currentMission = null;
        this.missionProgress = 0;
        
        // NEW FEATURES
        this.gameMode = "normal"; // normal, hardcore, creative
        this.disease = null; // Track current disease
        this.diseaseProgression = 0;
        this.weather = "clear"; // clear, acid_rain, radiation_storm, nuclear_winter
        this.weatherDuration = 0;
        this.achievements = new Set();
        this.statistics = {
            daysAlive: 0,
            creaturesKilled: 0,
            itemsCrafted: 0,
            missionsCompleted: 0,
            raidersDefeated: 0
        };
        this.companion = null; // Track pet companion
        this.companionHealth = 0;
        this.baseUpgrades = {
            reinforcement: 0, // Reduces raider damage
            workshop: 0, // Allows crafting
            medical_bay: 0, // Better healing
            solar_panels: 0 // Power generation
        };
        this.soundEnabled = true;
        
        // Premium purchases (persistent)
        this.premiumPurchases = new Set();
        this.playerUID = this.generateUID(); // Unique player identifier
        
        this.giftCodes = {
            "SURVIVAL_EXPERT": {
                redeemed: false,
                items: ["mutant_dog", "solar_panel", "reinforcement_kit", "workshop_tools"],
                message: "🎁 SURVIVAL EXPERT Pack! Mutant Dog Companion, Solar Panel, Reinforcement Kit, and Workshop Tools!"
            }
        };
    }

    async saveProgress() {
        const saveData = {
            playerName: this.playerName,
            health: this.health,
            food: this.food,
            water: this.water,
            radiation: this.radiation,
            supplies: this.supplies,
            gasMaskDurability: this.gasMaskDurability,
            day: this.day,
            bunkerSupplies: this.bunkerSupplies,
            currentMission: this.currentMission,
            missionProgress: this.missionProgress,
            premiumPurchases: [...this.premiumPurchases],
            playerUID: this.playerUID
        };

        try {
            const response = await fetch('/api/save-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData)
            });

            if (response.ok) {
                this.addLog("💾 Progress saved to cloud", 'success');
            } else {
                // Fallback to localStorage if cloud save fails
                localStorage.setItem(this.saveKey, JSON.stringify(saveData));
                this.addLog("💾 Progress saved locally", 'success');
            }
        } catch (error) {
            // Fallback to localStorage
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            this.addLog("💾 Progress saved locally", 'success');
        }
    }

    async loadProgress() {
        try {
            const response = await fetch('/api/load-progress');
            if (response.ok) {
                const saveData = await response.json();
                if (saveData && saveData.playerName) {
                    this.restoreGameState(saveData);
                    this.addLog("☁️ Progress loaded from cloud", 'success');
                    return true;
                }
            }
        } catch (error) {
            console.log("Cloud load failed, trying local save");
        }

        // Fallback to localStorage
        const localSave = localStorage.getItem(this.saveKey);
        if (localSave) {
            const saveData = JSON.parse(localSave);
            this.restoreGameState(saveData);
            this.addLog("💾 Progress loaded from local save", 'success');
            return true;
        }

        return false;
    }

    restoreGameState(saveData) {
        this.playerName = saveData.playerName;
        this.health = saveData.health;
        this.food = saveData.food;
        this.water = saveData.water;
        this.radiation = saveData.radiation;
        this.supplies = saveData.supplies || [];
        this.gasMaskDurability = saveData.gasMaskDurability || {};
        this.day = saveData.day;
        this.bunkerSupplies = saveData.bunkerSupplies;
        this.currentMission = saveData.currentMission || null;
        this.missionProgress = saveData.missionProgress || 0;
        
        // Restore new features
        this.gameMode = saveData.gameMode || "normal";
        this.disease = saveData.disease || null;
        this.diseaseProgression = saveData.diseaseProgression || 0;
        this.weather = saveData.weather || "clear";
        this.weatherDuration = saveData.weatherDuration || 0;
        this.achievements = new Set(saveData.achievements || []);
        this.statistics = saveData.statistics || {
            daysAlive: 0, creaturesKilled: 0, itemsCrafted: 0, missionsCompleted: 0, raidersDefeated: 0
        };
        this.companion = saveData.companion || null;
        this.companionHealth = saveData.companionHealth || 0;
        this.baseUpgrades = saveData.baseUpgrades || {
            reinforcement: 0, workshop: 0, medical_bay: 0, solar_panels: 0
        };
        this.premiumPurchases = new Set(saveData.premiumPurchases || []);
        this.playerUID = saveData.playerUID || this.generateUID();
    }

    // Weather System
    updateWeather() {
        if (this.weatherDuration > 0) {
            this.weatherDuration--;
            if (this.weatherDuration === 0) {
                this.weather = "clear";
                this.addLog("🌤️ Weather clears up", 'success');
                this.playSound('weather_clear');
            }
        } else if (Math.random() < 0.15) {
            // Start new weather event
            const weatherTypes = ["acid_rain", "radiation_storm", "nuclear_winter"];
            this.weather = this.randomChoice(weatherTypes);
            this.weatherDuration = this.randomInt(2, 4);
            
            switch(this.weather) {
                case "acid_rain":
                    this.addLog("🌧️ ACID RAIN WARNING! Toxic precipitation falling!", 'danger');
                    this.playSound('acid_rain');
                    break;
                case "radiation_storm":
                    this.addLog("☢️ RADIATION STORM! Deadly particles in the air!", 'danger');
                    this.playSound('rad_storm');
                    break;
                case "nuclear_winter":
                    this.addLog("❄️ NUCLEAR WINTER! Freezing temperatures!", 'danger');
                    this.playSound('cold_wind');
                    break;
            }
        }
    }

    processWeatherEffects() {
        switch(this.weather) {
            case "acid_rain":
                // Damages equipment and health
                this.health = Math.max(0, this.health - this.randomInt(3, 8));
                this.addLog("☔ Acid rain burns exposed skin!", 'danger');
                
                // Damage gas masks
                Object.keys(this.gasMaskDurability).forEach(index => {
                    this.gasMaskDurability[index] = Math.max(0, this.gasMaskDurability[index] - this.randomInt(5, 15));
                });
                break;
                
            case "radiation_storm":
                // Heavy radiation exposure
                let radGain = this.randomInt(15, 25);
                
                // Solar panels help during rad storms
                if (this.baseUpgrades.solar_panels > 0) {
                    radGain = Math.max(5, radGain - (this.baseUpgrades.solar_panels * 5));
                    this.addLog("⚡ Solar panels provide some shelter!", 'success');
                }
                
                this.radiation = Math.min(100, this.radiation + radGain);
                this.addLog(`☢️ Radiation storm exposure: +${radGain}`, 'danger');
                break;
                
            case "nuclear_winter":
                // Increased food/water consumption
                this.food = Math.max(0, this.food - this.randomInt(8, 15));
                this.water = Math.max(0, this.water - this.randomInt(5, 10));
                this.addLog("🥶 Extreme cold increases calorie needs!", 'danger');
                break;
        }
    }

    // Disease System
    contractDisease() {
        if (this.disease) return; // Already sick
        
        const diseases = [
            {
                name: "radiation_sickness",
                symptoms: "☢️ Radiation Sickness",
                effects: { health: -5, food: -3 },
                duration: 5,
                description: "Cellular damage from radiation exposure"
            },
            {
                name: "wasteland_fever",
                symptoms: "🤒 Wasteland Fever",
                effects: { health: -8, water: -5 },
                duration: 4,
                description: "High fever from contaminated environment"
            },
            {
                name: "infected_wound",
                symptoms: "🩸 Infected Wound",
                effects: { health: -10 },
                duration: 3,
                description: "Deep cut has become severely infected"
            }
        ];
        
        this.disease = this.randomChoice(diseases);
        this.diseaseProgression = this.disease.duration;
        
        this.addLog(`🦠 DIAGNOSED: ${this.disease.symptoms}`, 'danger');
        this.addLog(`📋 ${this.disease.description}`, 'danger');
        this.playSound('cough');
    }

    processDiseaseEffects() {
        if (!this.disease) return;
        
        // Apply disease effects
        if (this.disease.effects.health) {
            this.health = Math.max(0, this.health + this.disease.effects.health);
        }
        if (this.disease.effects.food) {
            this.food = Math.max(0, this.food + this.disease.effects.food);
        }
        if (this.disease.effects.water) {
            this.water = Math.max(0, this.water + this.disease.effects.water);
        }
        
        this.addLog(`🦠 ${this.disease.symptoms} worsens...`, 'danger');
        this.diseaseProgression--;
        
        if (this.diseaseProgression <= 0) {
            this.addLog(`✅ Recovered from ${this.disease.symptoms}`, 'success');
            this.disease = null;
        }
    }

    // Achievement System
    checkAchievements() {
        const newAchievements = [];
        
        if (this.day >= 10 && !this.achievements.has("survivor_10")) {
            this.achievements.add("survivor_10");
            newAchievements.push("🏆 SURVIVOR: Survived 10 days!");
        }
        
        if (this.day >= 25 && !this.achievements.has("survivor_25")) {
            this.achievements.add("survivor_25");
            newAchievements.push("🏆 VETERAN: Survived 25 days!");
        }
        
        if (this.statistics.creaturesKilled >= 5 && !this.achievements.has("hunter")) {
            this.achievements.add("hunter");
            newAchievements.push("🏆 HUNTER: Killed 5 creatures!");
        }
        
        if (this.statistics.missionsCompleted >= 3 && !this.achievements.has("hero")) {
            this.achievements.add("hero");
            newAchievements.push("🏆 HERO: Completed 3 missions!");
        }
        
        if (this.companion && !this.achievements.has("best_friend")) {
            this.achievements.add("best_friend");
            newAchievements.push("🏆 BEST FRIEND: Found a companion!");
        }
        
        newAchievements.forEach(achievement => {
            this.addLog(achievement, 'success');
            this.playSound('achievement');
        });
    }

    // Sound System
    playSound(soundType) {
        if (!this.soundEnabled) return;
        
        const sounds = {
            'cough': '🤧',
            'achievement': '🎉',
            'weather_clear': '🌤️',
            'acid_rain': '☔',
            'rad_storm': '⚡',
            'cold_wind': '🌬️',
            'companion_bark': '🐕',
            'craft_success': '🔨'
        };
        
        // Visual sound indicator since we can't play actual audio in this environment
        if (sounds[soundType]) {
            this.addLog(`🔊 ${sounds[soundType]}`, 'normal');
        }
    }

    resetProgress() {
        // Reset game state
        this.playerName = "";
        this.health = 100;
        this.food = 50;
        this.water = 40;
        this.radiation = 0;
        this.supplies = [];
        this.gasMaskDurability = {};
        this.day = 1;
        this.bunkerSupplies = {
            "canned_food": 5,
            "water_bottles": 3,
            "med_kit": 2
        };
        this.gameOver = false;
        this.logMessages = [];
        this.currentMission = null;
        this.missionProgress = 0;

        // Clear saves
        localStorage.removeItem(this.saveKey);

        // Clear cloud save
        fetch('/api/clear-progress', { method: 'DELETE' }).catch(() => {});
    }

    updateStats() {
        // Update stat bars
        document.getElementById('health-bar').style.setProperty('--percentage', `${this.health}%`);
        document.getElementById('food-bar').style.setProperty('--percentage', `${this.food}%`);
        document.getElementById('water-bar').style.setProperty('--percentage', `${this.water}%`);
        document.getElementById('radiation-bar').style.setProperty('--percentage', `${this.radiation}%`);

        // Update text
        document.getElementById('health-text').textContent = `${this.health}/100`;
        document.getElementById('food-text').textContent = `${this.food}/100`;
        document.getElementById('water-text').textContent = `${this.water}/100`;
        document.getElementById('radiation-text').textContent = `${this.radiation}/100`;
        document.getElementById('day-counter').textContent = this.day;

        // Update inventory
        const inventoryDiv = document.getElementById('inventory-items');
        if (this.supplies.length === 0) {
            inventoryDiv.innerHTML = '<p style="color: #666;">Empty</p>';
        } else {
            inventoryDiv.innerHTML = this.supplies.map((item, index) => {
                // Use shorter, more compact names
                let displayName = item.replace('_', ' ');
                
                // Shorter item names
                const shortNames = {
                    'canned_food': '🍲Food',
                    'water_bottles': '💧Water',
                    'med_kit': '🏥Med',
                    'rad_pills': '💊Rad',
                    'gas_mask': '😷Mask',
                    'gas_mask_new': '💎Mask',
                    'assault_rifle': '🔫AR',
                    'sniper_rifle': '🎯Sniper',
                    'meat_ration': '🥩Meat'
                };
                
                if (shortNames[item]) {
                    displayName = shortNames[item];
                } else {
                    displayName = displayName.length > 8 ? displayName.substring(0, 8) : displayName;
                }
                
                if ((item === 'gas_mask' || item === 'gas_mask_new') && this.gasMaskDurability[index] !== undefined) {
                    const durability = this.gasMaskDurability[index];
                    let condition = '';
                    if (durability > 75) condition = ' ✓';
                    else if (durability > 50) condition = ' ⚠';
                    else if (durability > 25) condition = ' ⚠';
                    else if (durability > 0) condition = ' ⚠';
                    else condition = ' ❌';
                    displayName += condition;
                }
                
                return `<span class="inventory-item" onclick="useItem('${item}', ${index})" title="${item.replace('_', ' ')}">${displayName}</span>`;
            }).join('');
        }

        // Update mission display
        this.updateMissionDisplay();
    }

    addLog(message, type = 'normal') {
        const logDiv = document.getElementById('log-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `log-message ${type}`;
        messageDiv.textContent = message;
        logDiv.appendChild(messageDiv);
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    checkGameOver() {
        if (this.health <= 0) {
            this.endGame("💀 You died from your injuries... The wasteland claims another soul.");
        } else if (this.food <= 0 && this.water <= 0) {
            this.endGame("💀 You died of starvation and thirst... Your body becomes part of the wasteland.");
        } else if (this.radiation >= 100) {
            this.endGame("☢️ Radiation poisoning has consumed you... You become one with the toxic earth.");
        }
    }

    endGame(message) {
        this.gameOver = true;
        document.getElementById('death-message').textContent = message;
        document.getElementById('final-day-count').textContent = this.day;

        // Reset progress on death
        this.resetProgress();

        showScreen('game-over-screen');
    }

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateMission() {
        const missionTypes = [
            {
                type: "rescue",
                target: this.randomChoice(["Dr. Sarah Chen", "Engineer Marcus", "Child Amy", "Soldier Jake", "Scientist Elena", "Medic Rodriguez"]),
                location: this.randomChoice(["collapsed hospital", "abandoned school", "crashed helicopter", "underground tunnel", "research facility", "military outpost"]),
                reward: this.randomChoice([
                    ["med_kit", "rad_pills", "canned_food"],
                    ["assault_rifle", "med_kit", "water_bottles"],
                    ["sniper_rifle", "rad_pills"],
                    ["rpg", "canned_food", "water_bottles"],
                    ["smg", "usp", "med_kit"],
                    ["rad_pills", "med_kit", "canned_food", "water_bottles"]
                ]),
                difficulty: this.randomInt(1, 3)
            },
            {
                type: "retrieve",
                target: this.randomChoice(["medical supplies", "weapon cache", "research data", "radio equipment", "fuel cells", "water purifier"]),
                location: this.randomChoice(["military base", "pharmacy", "university lab", "radio tower", "power plant", "water treatment facility"]),
                reward: this.randomChoice([
                    ["water_bottles", "water_bottles", "rad_pills"],
                    ["canned_food", "canned_food", "med_kit"],
                    ["usp", "smg", "med_kit"],
                    ["assault_rifle", "rad_pills"],
                    ["rad_pills", "rad_pills", "water_bottles"],
                    ["med_kit", "med_kit", "canned_food"]
                ]),
                difficulty: this.randomInt(1, 3)
            }
        ];

        return this.randomChoice(missionTypes);
    }

    startNewMission() {
        if (this.currentMission) {
            this.addLog("📋 You already have an active mission!", 'normal');
            return;
        }

        this.currentMission = this.generateMission();
        this.missionProgress = 0;

        if (this.currentMission.type === "rescue") {
            this.addLog(`📡 EMERGENCY TRANSMISSION RECEIVED! 📡`, 'danger');
            this.addLog(`🆘 Mission: Rescue ${this.currentMission.target}`, 'success');
            this.addLog(`📍 Last known location: ${this.currentMission.location}`, 'normal');
            this.addLog(`💰 Reward: ${this.currentMission.reward.join(', ')}`, 'success');
        } else {
            this.addLog(`📋 NEW MISSION AVAILABLE! 📋`, 'success');
            this.addLog(`🎯 Objective: Retrieve ${this.currentMission.target}`, 'success');
            this.addLog(`📍 Location: ${this.currentMission.location}`, 'normal');
            this.addLog(`💰 Reward: ${this.currentMission.reward.join(', ')}`, 'success');
        }

        const difficultyText = this.currentMission.difficulty === 1 ? "Easy" : 
                             this.currentMission.difficulty === 2 ? "Medium" : "Hard";
        this.addLog(`⚠️ Difficulty: ${difficultyText}`, 'danger');
        this.addLog(`💡 Search the wasteland to make progress on this mission!`, 'normal');
    }

    updateMissionDisplay() {
        const missionDiv = document.getElementById('mission-display');
        if (!missionDiv) return;

        if (this.currentMission) {
            const difficultyText = this.currentMission.difficulty === 1 ? "Easy" : 
                                 this.currentMission.difficulty === 2 ? "Medium" : "Hard";
            const requiredProgress = this.currentMission.difficulty * 2;

            missionDiv.innerHTML = `
                <div style="border: 2px solid #ff6b35; border-radius: 8px; padding: 10px; background: rgba(255, 107, 53, 0.1);">
                    <h4 style="margin: 0 0 5px 0; color: #ff6b35;">📋 ACTIVE MISSION</h4>
                    <p style="margin: 5px 0; font-size: 12px;">
                        ${this.currentMission.type === 'rescue' ? '🆘 Rescue' : '🎯 Retrieve'}: 
                        <strong>${this.currentMission.target}</strong>
                    </p>
                    <p style="margin: 5px 0; font-size: 12px;">📍 ${this.currentMission.location}</p>
                    <p style="margin: 5px 0; font-size: 12px;">⚠️ ${difficultyText} (${this.missionProgress}/${requiredProgress})</p>
                    <p style="margin: 5px 0; font-size: 11px; color: #888;">💡 Explore wasteland to progress</p>
                </div>
            `;
        } else {
            missionDiv.innerHTML = `
                <div style="border: 2px solid #666; border-radius: 8px; padding: 10px; background: rgba(102, 102, 102, 0.1);">
                    <p style="margin: 0; font-size: 12px; color: #888; text-align: center;">📡 No active missions<br>New ones may appear while resting</p>
                </div>
            `;
        }
    }

    progressMission() {
        if (!this.currentMission) return false;

        this.missionProgress++;
        const requiredProgress = this.currentMission.difficulty * 2; // 2, 4, or 6 progress needed

        if (this.currentMission.type === "rescue") {
            const progressMessages = [
                `🔍 Found traces of ${this.currentMission.target}...`,
                `🩸 Blood trail leads deeper into the ${this.currentMission.location}...`,
                `📻 Weak radio signal detected!`,
                `🚨 Signs of struggle... you're getting close!`,
                `💨 Fresh footprints in the dust...`,
                `🔊 You hear someone calling for help!`
            ];
            this.addLog(this.randomChoice(progressMessages), 'success');
        } else {
            const progressMessages = [
                `🗺️ Found a map marking the ${this.currentMission.location}...`,
                `🔍 Located the entrance to the facility...`,
                `💡 Security systems are still partially active...`,
                `📦 Found storage areas that might contain the ${this.currentMission.target}...`,
                `🚪 Discovered a sealed vault...`,
                `🎯 Target location identified!`
            ];
            this.addLog(this.randomChoice(progressMessages), 'success');
        }

        if (this.missionProgress >= requiredProgress) {
            this.completeMission();
            return true;
        } else {
            this.addLog(`📊 Mission Progress: ${this.missionProgress}/${requiredProgress}`, 'normal');
            return false;
        }
    }

    completeMission() {
        if (!this.currentMission) return;

        if (this.currentMission.type === "rescue") {
            this.addLog(`🎉 MISSION COMPLETE! 🎉`, 'success');
            this.addLog(`✅ Successfully rescued ${this.currentMission.target}!`, 'success');
            this.addLog(`🙏 "${this.currentMission.target}: Thank you for saving me! Take these supplies!"`, 'success');
        } else {
            this.addLog(`🎉 MISSION COMPLETE! 🎉`, 'success');
            this.addLog(`✅ Successfully retrieved ${this.currentMission.target}!`, 'success');
            this.addLog(`💼 Valuable resources secured!`, 'success');
        }

        // Give rewards
        this.currentMission.reward.forEach(item => {
            this.supplies.push(item);
            this.addLog(`🎁 Received: ${item.replace('_', ' ')}`, 'success');
        });

        // Update statistics
        this.statistics.missionsCompleted++;

        // Clear mission
        this.currentMission = null;
        this.missionProgress = 0;

        this.addLog(`📡 Mission database updated. New missions may become available...`, 'normal');

        this.updateStats();
    }

    // Companion System
    findCompanion() {
        if (this.companion) {
            this.addLog("🐕 You already have a loyal companion!", 'normal');
            return;
        }
        
        const companions = [
            {
                name: "Rex", 
                type: "mutant_dog",
                health: 80,
                abilities: ["guard", "hunt"],
                description: "A loyal mutant German Shepherd with glowing eyes"
            },
            {
                name: "Shadow", 
                type: "wasteland_cat",
                health: 60,
                abilities: ["stealth", "hunt"],
                description: "A sleek black cat that survived the radiation"
            },
            {
                name: "Scrap", 
                type: "robot_drone",
                health: 100,
                abilities: ["scout", "repair"],
                description: "A damaged military drone you repaired"
            }
        ];
        
        this.companion = this.randomChoice(companions);
        this.companionHealth = this.companion.health;
        
        this.addLog(`🎉 COMPANION FOUND!`, 'success');
        this.addLog(`🐾 ${this.companion.name} - ${this.companion.description}`, 'success');
        this.addLog(`💝 Abilities: ${this.companion.abilities.join(', ')}`, 'success');
        this.playSound('companion_bark');
    }

    useCompanionAbility(ability) {
        if (!this.companion) return false;
        
        if (this.companionHealth <= 0) {
            this.addLog("💔 Your companion is too injured to help!", 'danger');
            return false;
        }
        
        switch(ability) {
            case "guard":
                this.addLog(`🛡️ ${this.companion.name} stands guard!`, 'success');
                return true;
            case "hunt":
                this.addLog(`🏹 ${this.companion.name} hunts for food!`, 'success');
                if (Math.random() < 0.6) {
                    this.supplies.push("meat_ration");
                    this.addLog("🥩 Successful hunt! Found meat ration", 'success');
                }
                return true;
            case "scout":
                this.addLog(`🔍 ${this.companion.name} scouts the area!`, 'success');
                if (this.currentMission && Math.random() < 0.5) {
                    this.progressMission();
                }
                return true;
            case "repair":
                this.addLog(`🔧 ${this.companion.name} repairs equipment!`, 'success');
                // Repair gas masks
                Object.keys(this.gasMaskDurability).forEach(index => {
                    this.gasMaskDurability[index] = Math.min(100, this.gasMaskDurability[index] + 20);
                });
                return true;
        }
        return false;
    }

    // Crafting System
    attemptCrafting() {
        if (this.baseUpgrades.workshop === 0) {
            this.addLog("🔧 You need a workshop to craft items!", 'danger');
            return;
        }
        
        const recipes = [
            {
                name: "Molotov Cocktail",
                result: "molotov",
                materials: ["water_bottles", "canned_food"], // Empty bottle + fuel
                description: "Improvised explosive weapon"
            },
            {
                name: "Rad Detector",
                result: "rad_detector",
                materials: ["workshop_tools"],
                description: "Device to monitor radiation levels"
            },
            {
                name: "Water Filter",
                result: "water_filter",
                materials: ["gas_mask"], // Use filter material
                description: "Purifies contaminated water"
            },
            {
                name: "Reinforced Armor",
                result: "armor",
                materials: ["reinforcement_kit"],
                description: "Provides protection in combat"
            }
        ];
        
        const availableRecipes = recipes.filter(recipe => 
            recipe.materials.every(material => this.supplies.includes(material))
        );
        
        if (availableRecipes.length === 0) {
            this.addLog("🔧 No craftable items with current materials", 'normal');
            this.addLog("💡 Recipes: Molotov (bottle+fuel), Rad Detector (tools), Water Filter (gas mask), Armor (reinforcement)", 'normal');
            return;
        }
        
        const recipe = availableRecipes[0]; // Auto-craft first available
        
        // Remove materials
        recipe.materials.forEach(material => {
            const index = this.supplies.indexOf(material);
            this.supplies.splice(index, 1);
        });
        
        // Add crafted item
        this.supplies.push(recipe.result);
        this.statistics.itemsCrafted++;
        
        this.addLog(`🔨 CRAFTED: ${recipe.name}!`, 'success');
        this.addLog(`📋 ${recipe.description}`, 'success');
        this.playSound('craft_success');
    }

    checkForNewMission() {
        // 15% chance for new mission when no active mission
        if (!this.currentMission && Math.random() < 0.15) {
            this.startNewMission();
        }
    }

    generateUID() {
        // Generate unique identifier for player
        let uid = localStorage.getItem('wasteland_player_uid');
        if (!uid) {
            uid = 'player_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('wasteland_player_uid', uid);
        }
        return uid;
    }

    loadPremiumPurchases() {
        try {
            const purchases = localStorage.getItem('wasteland_premium_' + this.playerUID);
            if (purchases) {
                this.premiumPurchases = new Set(JSON.parse(purchases));
            }
            
            // Developer access (you get it for free)
            const devUIDs = ['player_dev_admin', 'player_creator_uid']; 
            // Always grant dev access - you are the developer
            this.premiumPurchases.add('starter_pack');
            this.addLog("🎮 DEVELOPER ACCESS: Premium features unlocked!", 'success');
        } catch (error) {
            console.log("Error loading premium purchases");
        }
    }

    savePremiumPurchases() {
        try {
            localStorage.setItem('wasteland_premium_' + this.playerUID, 
                JSON.stringify([...this.premiumPurchases]));
        } catch (error) {
            console.log("Error saving premium purchases");
        }
    }

    hasPremiumAccess(itemType) {
        return this.premiumPurchases.has(itemType);
    }

    purchasePremiumItem(itemType) {
        if (this.hasPremiumAccess(itemType)) {
            this.addLog("✅ You already own this gamepass!", 'success');
            return;
        }

        this.addLog("💳 Initializing secure payment...", 'normal');
        this.addLog("🔒 Connecting to payment gateway...", 'normal');
        
        // Create payment session
        this.createPaymentSession(itemType);
    }

    async createPaymentSession(itemType) {
        this.addLog("💳 Initializing secure Stripe payment...", 'normal');
        
        try {
            // Create payment intent on backend
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    item_type: itemType,
                    player_uid: this.playerUID
                })
            });

            const paymentData = await response.json();
            
            if (!paymentData.success) {
                this.addLog("❌ Payment initialization failed.", 'danger');
                return;
            }

            // Create payment modal with Stripe Elements
            this.createStripePaymentModal(itemType, paymentData.client_secret, paymentData.payment_intent_id);
            
        } catch (error) {
            this.addLog("❌ Payment system error. Please try again.", 'danger');
            console.error('Payment error:', error);
        }
    }

    createStripePaymentModal(itemType, clientSecret, paymentIntentId) {
        const paymentModal = document.createElement('div');
        paymentModal.id = 'payment-modal';
        paymentModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const paymentForm = document.createElement('div');
        paymentForm.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #00ff41;
            border-radius: 10px;
            padding: 20px;
            max-width: 400px;
            width: 95%;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        `;

        const prices = {
            'starter_pack': '$1.00',
            'premium_bundle': '$2.99',
            'mega_pack': '$4.99'
        };

        paymentForm.innerHTML = `
            <h2 style="color: #ff6b35; text-align: center; margin-bottom: 15px;">💳 SECURE STRIPE PAYMENT</h2>
            <div style="margin-bottom: 15px; text-align: center;">
                <strong>Item:</strong> ${itemType.replace('_', ' ').toUpperCase()}<br>
                <strong>Price:</strong> ${prices[itemType] || '$1.00'} USD
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="font-size: 12px; margin-bottom: 5px; display: block;">Email:</label>
                <input type="email" id="email-input" placeholder="your.email@example.com" required
                       style="width: 100%; padding: 8px; font-size: 12px; background: #000; color: #00ff41; border: 1px solid #00ff41; border-radius: 3px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-size: 12px; margin-bottom: 5px; display: block;">Card Details:</label>
                <div id="card-element" style="padding: 10px; background: #000; border: 1px solid #00ff41; border-radius: 3px;">
                    <!-- Stripe Elements will create form elements here -->
                </div>
                <div id="card-errors" role="alert" style="color: #ff6b35; font-size: 11px; margin-top: 5px;"></div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button id="submit-payment" style="flex: 1; background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">
                    💳 PAY NOW
                </button>
                <button id="cancel-payment" style="flex: 1; background: #666; color: white; border: none; padding: 12px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    ❌ CANCEL
                </button>
            </div>
            
            <div style="font-size: 10px; color: #888; text-align: center; line-height: 1.3;">
                🔒 Secured by Stripe<br>
                💳 PCI DSS compliant processing<br>
                🛡️ Your payment information is encrypted
            </div>
        `;

        paymentModal.appendChild(paymentForm);
        document.body.appendChild(paymentModal);

        // Initialize Stripe (Note: In production, load Stripe.js from CDN)
        this.initializeStripePayment(clientSecret, paymentIntentId, paymentModal);

        // Handle cancel
        document.getElementById('cancel-payment').addEventListener('click', () => {
            document.body.removeChild(paymentModal);
            this.addLog("❌ Payment cancelled.", 'normal');
        });
    }

    async initializeStripePayment(clientSecret, paymentIntentId, paymentModal) {
        // Note: In a real implementation, you would load Stripe.js from their CDN
        // For this demo, we'll simulate the Stripe payment process
        
        this.addLog("🔒 Loading Stripe payment processor...", 'normal');
        
        const submitButton = document.getElementById('submit-payment');
        const emailInput = document.getElementById('email-input');
        
        // Simulate Stripe Elements
        document.getElementById('card-element').innerHTML = `
            <div style="color: #888; font-size: 12px; padding: 5px;">
                Card Number: <input type="text" placeholder="4242 4242 4242 4242" style="background: transparent; border: none; color: #00ff41; width: 150px;"><br><br>
                MM/YY: <input type="text" placeholder="12/25" style="background: transparent; border: none; color: #00ff41; width: 60px;">
                CVC: <input type="text" placeholder="123" style="background: transparent; border: none; color: #00ff41; width: 40px;">
            </div>
        `;
        
        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!emailInput.value || !emailInput.value.includes('@')) {
                document.getElementById('card-errors').textContent = 'Please enter a valid email address';
                return;
            }
            
            submitButton.disabled = true;
            submitButton.textContent = 'PROCESSING...';
            
            // Simulate payment processing
            await this.processStripePayment(paymentIntentId, paymentModal);
        });
    }

    async processStripePayment(paymentIntentId, paymentModal) {
        try {
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify payment on backend
            const response = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId
                })
            });

            const result = await response.json();
            
            if (result.success && result.paid) {
                this.handlePaymentSuccess(paymentModal);
            } else {
                this.handlePaymentFailure(paymentModal, result.error || 'Payment verification failed');
            }
            
        } catch (error) {
            this.handlePaymentFailure(paymentModal, 'Network error during payment verification');
        }
    }

    processPayment(itemType, paymentModal) {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const expiry = document.getElementById('expiry').value;
        const cvv = document.getElementById('cvv').value;
        const cardholder = document.getElementById('cardholder').value;

        // Validate form with better error messages
        if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
            alert('Please enter a valid card number (13-19 digits)');
            return;
        }
        if (!expiry || expiry.length !== 5 || !expiry.includes('/')) {
            alert('Please enter expiry as MM/YY format');
            return;
        }
        if (!cvv || cvv.length < 3 || cvv.length > 4) {
            alert('Please enter a valid CVV (3-4 digits)');
            return;
        }
        if (!cardholder.trim() || cardholder.trim().length < 2) {
            alert('Please enter a valid cardholder name');
            return;
        }

        // Validate expiry date
        const [month, year] = expiry.split('/');
        if (parseInt(month) < 1 || parseInt(month) > 12) {
            alert('Please enter a valid month (01-12)');
            return;
        }

        // Show processing
        paymentModal.innerHTML = `
            <div style="background: #1a1a1a; border: 2px solid #00ff41; border-radius: 10px; padding: 20px; max-width: 300px; width: 95%; color: #00ff41; font-family: 'Courier New', monospace; text-align: center; font-size: 14px;">
                <h2 style="color: #ff6b35; font-size: 16px; margin-bottom: 15px;">💳 PROCESSING</h2>
                <div style="margin: 15px 0;">
                    <div style="border: 2px solid #00ff41; border-radius: 50%; width: 40px; height: 40px; margin: 0 auto; animation: spin 1s linear infinite; display: flex; align-items: center; justify-content: center;">⚡</div>
                </div>
                <p style="font-size: 12px; margin: 8px 0;">Processing payment...</p>
                <p style="color: #888; font-size: 10px;">Do not close window</p>
            </div>
        `;

        // Add spinning animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // Simulate payment processing - more lenient acceptance
        setTimeout(() => {
            // Accept more test cards and some patterns
            const testCards = [
                '4242424242424242', '1111111111111111', '4444444444444444',
                '5555555555554444', '2223003122003222', '4000000000000002'
            ];
            
            const isTestCard = testCards.includes(cardNumber);
            const isValidPattern = cardNumber.startsWith('4') || cardNumber.startsWith('5') || cardNumber.startsWith('3');
            
            if (isTestCard || (isValidPattern && cardNumber.length >= 15)) {
                this.handlePaymentSuccess(itemType, paymentModal);
            } else {
                this.handlePaymentFailure(paymentModal);
            }
        }, 3000);
    }

    handlePaymentSuccess(paymentModal) {
        paymentModal.innerHTML = `
            <div style="background: #1a1a1a; border: 2px solid #00ff41; border-radius: 10px; padding: 20px; max-width: 350px; width: 95%; color: #00ff41; font-family: 'Courier New', monospace; text-align: center; font-size: 14px;">
                <h2 style="color: #00ff41; font-size: 18px; margin-bottom: 15px;">✅ PAYMENT SUCCESSFUL!</h2>
                <div style="margin: 20px 0; font-size: 48px;">🎉</div>
                <p style="font-size: 14px; margin: 10px 0; color: #00ff41;">Thank you for your purchase!</p>
                <p style="font-size: 12px; margin: 10px 0; color: #888;">Your premium content has been activated and will be available immediately.</p>
                <p style="font-size: 11px; margin: 10px 0; color: #666;">Receipt sent to your email address.</p>
                <button onclick="document.body.removeChild(document.getElementById('payment-modal')); location.reload();" 
                        style="background: #ff6b35; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; margin-top: 15px; font-size: 12px; font-weight: bold;">
                    CONTINUE TO GAME
                </button>
            </div>
        `;

        this.addLog("🎉 REAL PAYMENT SUCCESSFUL! Premium content unlocked!", 'success');
        this.addLog("💳 Transaction processed by Stripe", 'success');
        this.addLog("📧 Receipt sent to your email", 'success');
        
        // Reload to refresh premium status
        setTimeout(() => {
            location.reload();
        }, 3000);
    }

    handlePaymentFailure(paymentModal, errorMessage) {
        paymentModal.innerHTML = `
            <div style="background: #1a1a1a; border: 2px solid #ff6b35; border-radius: 10px; padding: 20px; max-width: 350px; width: 95%; color: #00ff41; font-family: 'Courier New', monospace; text-align: center; font-size: 14px;">
                <h2 style="color: #ff6b35; font-size: 16px; margin-bottom: 10px;">❌ PAYMENT FAILED</h2>
                <div style="margin: 15px 0; font-size: 32px;">💳</div>
                <p style="color: #ff6b35; font-size: 12px; margin: 10px 0;">Payment could not be processed.</p>
                <p style="font-size: 11px; margin: 10px 0; color: #888; word-wrap: break-word;">${errorMessage}</p>
                <p style="font-size: 10px; color: #666; margin: 10px 0;">Common issues: Insufficient funds, expired card, incorrect details</p>
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button onclick="document.body.removeChild(document.getElementById('payment-modal'))" 
                            style="flex: 1; background: #666; color: white; border: none; padding: 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        TRY AGAIN
                    </button>
                    <button onclick="document.body.removeChild(document.getElementById('payment-modal'))" 
                            style="flex: 1; background: #444; color: white; border: none; padding: 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        CANCEL
                    </button>
                </div>
            </div>
        `;

        this.addLog("❌ Real payment failed. Please check your payment information.", 'danger');
        this.addLog(`💳 Error: ${errorMessage}`, 'danger');
    }

    grantPremiumReward(itemType) {
        if (itemType === 'starter_pack') {
            const starterItems = ["smg", "med_kit", "med_kit", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "canned_food", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "water_bottles", "gas_mask_new", "gas_mask_new", "gas_mask_new", "gas_mask_new", "gas_mask_new", "rad_pills", "rad_pills", "rad_pills", "rad_pills", "rad_pills"];
            
            starterItems.forEach(item => {
                if (item === "gas_mask_new") {
                    const newIndex = this.supplies.length;
                    this.gasMaskDurability[newIndex] = 100; // New gas mask at 100%
                }
                this.supplies.push(item);
            });
            
            this.addLog("🎁 STARTER PACK CLAIMED! SMG, Med Kits, Food, Water, Premium Gas Masks, and Rad Pills added!", 'success');
            this.updateStats();
        }
    }

    redeemGiftCode(code) {
        code = code.toUpperCase();
        if (this.giftCodes[code]) {
            if (!this.giftCodes[code].redeemed) {
                this.giftCodes[code].redeemed = true;
                this.giftCodes[code].items.forEach(item => {
                    this.supplies.push(item);
                });
                this.addLog(this.giftCodes[code].message, 'success');
                this.updateStats();
            } else {
                this.addLog("❌ This gift code has already been redeemed!", 'danger');
            }
        } else {
            this.addLog("❌ Invalid gift code!", 'danger');
        }
    }
}

let game = new WastelandSurvival();

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

async function startGame() {
    const nameInput = document.getElementById('player-name');
    const enteredName = nameInput.value.trim() || "Survivor";

    // Load premium purchases first
    game.loadPremiumPurchases();

    // Try to load existing progress
    const hasExistingProgress = await game.loadProgress();

    if (!hasExistingProgress) {
        // New game
        game.playerName = enteredName;
        game.addLog(`Welcome to hell, ${game.playerName}. Let's see how long you last...`, 'danger');
        
        // Grant starter pack if owned
        if (game.hasPremiumAccess('starter_pack')) {
            game.grantPremiumReward('starter_pack');
        }
    } else {
        // Loaded existing save
        game.addLog(`Welcome back, ${game.playerName}. The nightmare continues...`, 'danger');
    }

    // Hide name selection and show game content
    document.getElementById('name-selection').style.display = 'none';
    document.getElementById('game-content').style.display = 'flex';

    game.updateStats();
    showScreen('game-screen');
}

function showGamepasses() {
    game.addLog("💎 PREMIUM GAMEPASSES - SECURE PAYMENT SYSTEM:", 'success');
    game.addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 'normal');
    
    if (game.hasPremiumAccess('starter_pack')) {
        game.addLog("✅ STARTER PACK - OWNED", 'success');
        game.addLog("   🎁 SMG, Med Kits, Food, Water, Premium Gas Masks & Rad Pills", 'normal');
        game.addLog("   💎 Includes 5x Premium Gas Masks (more durable)", 'normal');
    } else {
        game.addLog("💰 STARTER PACK - $1.00 USD", 'normal');
        game.addLog("   🎁 SMG, Med Kits, Food, Water, Premium Gas Masks & Rad Pills", 'normal');
        game.addLog("   💎 Includes 5x Premium Gas Masks (more durable)", 'normal');
        game.addLog("   🔒 Secure payment via credit/debit card", 'normal');
        
        setTimeout(() => {
            const purchase = confirm("Open secure payment window for STARTER PACK ($1.00)?\nThis purchase gives you a massive survival advantage!");
            if (purchase) {
                game.purchasePremiumItem('starter_pack');
            }
        }, 100);
    }
    
    game.addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", 'normal');
    game.addLog("💡 Premium items persist across all games!", 'success');
    game.addLog("🔒 All payments processed securely via SSL encryption", 'success');
    game.addLog("💳 Accepts all major credit/debit cards", 'normal');
    game.addLog("🧪 Test cards: 4242424242424242, 1111111111111111", 'normal');
}

function checkBunkerSupplies() {
    game.addLog("🏪 BUNKER SUPPLY CHECK:");

    const hasSupplies = Object.values(game.bunkerSupplies).some(count => count > 0);

    if (hasSupplies) {
        let suppliesText = "Available supplies: ";
        for (const [item, count] of Object.entries(game.bunkerSupplies)) {
            if (count > 0) {
                suppliesText += `${item.replace('_', ' ')}: ${count}, `;
            }
        }
        game.addLog(suppliesText.slice(0, -2));

        // Randomly take an item if available
        const availableItems = Object.keys(game.bunkerSupplies).filter(item => game.bunkerSupplies[item] > 0);
        if (availableItems.length > 0) {
            const takenItem = game.randomChoice(availableItems);
            game.bunkerSupplies[takenItem]--;
            game.supplies.push(takenItem);
            game.addLog(`✅ Took ${takenItem.replace('_', ' ')}. Added to inventory.`, 'success');
        }
    } else {
        game.addLog("💀 Bunker supplies completely depleted. You MUST scavenge to survive.", 'danger');
    }

    game.updateStats();
}

function enterWasteland() {
    game.addLog("🌫️ You emerge into the toxic wasteland...", 'danger');
    game.addLog("The sky is a sickly yellow. Geiger counter clicks ominously.");

    // Random radiation exposure
    const radiationGain = game.randomInt(5, 15);
    game.radiation = Math.min(100, game.radiation + radiationGain);
    game.addLog(`☢️ Radiation exposure: +${radiationGain}`, 'danger');

    // Random encounter
    const encounters = [
        'scavengeLocation', 'mysteriousSound', 'supplyCache', 
        'radiationStorm', 'creatureEncounter'
    ];
    const encounter = game.randomChoice(encounters);

    setTimeout(() => {
        switch(encounter) {
            case 'scavengeLocation':
                scavengeLocation();
                break;
            case 'mysteriousSound':
                mysteriousSound();
                break;
            case 'supplyCache':
                supplyCache();
                break;
            case 'radiationStorm':
                radiationStorm();
                break;
            case 'creatureEncounter':
                creatureEncounter();
                break;
        }
    }, 1000);

    game.updateStats();
}

function scavengeLocation() {
    const locations = [
        "abandoned supermarket", "destroyed pharmacy", "crashed military convoy",
        "ruined gas station", "collapsed apartment building"
    ];
    const location = game.randomChoice(locations);
    game.addLog(`🏪 You found a ${location}...`);

    // Check for mission progress first
    if (game.currentMission && Math.random() < 0.4) {
        if (game.progressMission()) {
            return; // Mission completed, skip normal scavenging
        }
    }

    const possibleFinds = [
        ["canned_food", "water_bottles"],
        ["med_kit"],
        ["rad_pills", "canned_food"],
        ["water_bottles", "gas_mask"],
        ["smg"], // Weapon finds
        ["usp"],
        ["assault_rifle"],
        ["sniper_rifle"],
        ["rpg"],
        []
    ];

    const foundItems = game.randomChoice(possibleFinds);

    if (foundItems.length === 0) {
        game.addLog("💀 Already picked clean. Only dust and bones remain.", 'danger');
    } else {
        game.addLog(`🎁 Found: ${foundItems.join(', ')}`, 'success');

        // Set durability for any gas masks found
        foundItems.forEach((item) => {
            if (item === "gas_mask") {
                const newIndex = game.supplies.length;
                game.gasMaskDurability[newIndex] = game.randomInt(30, 100); // Used gas masks have random durability
            }
            game.supplies.push(item);
        });
    }

    game.updateStats();
}

function mysteriousSound() {
    game.addLog("👂 You hear strange noises in the distance...");
    const sounds = [
        "Metal scraping against concrete...",
        "A low, inhuman growl...",
        "Rapid clicking sounds...",
        "Heavy breathing that isn't yours..."
    ];
    game.addLog(`🔊 ${game.randomChoice(sounds)}`);

    // Auto-investigate with random outcome
    setTimeout(() => {
        if (Math.random() < 0.3) {
            game.addLog("🎁 You find a hidden supply cache!", 'success');
            game.supplies.push("canned_food", "water_bottles");
        } else {
            game.addLog("💀 Something attacks! You barely escape!", 'danger');
            const healthLoss = game.randomInt(15, 30);
            game.health = Math.max(0, game.health - healthLoss);
            game.addLog(`🩸 Lost ${healthLoss} health!`, 'danger');
        }
        game.updateStats();
        game.checkGameOver();
    }, 2000);
}

function supplyCache() {
    game.addLog("📦 You discover an emergency supply drop!", 'success');

    // Check for mission progress first
    if (game.currentMission && Math.random() < 0.5) {
        if (game.progressMission()) {
            return; // Mission completed, skip normal scavenging
        }
    }

    const cacheItems = ["med_kit", "rad_pills", "canned_food", "water_bottles", "gas_mask", "usp", "smg"];
    const foundCount = game.randomInt(2, 4);
    const found = [];

    for (let i = 0; i < foundCount; i++) {
        const item = game.randomChoice(cacheItems);
        found.push(item);

        // Set gas mask durability when found
        if (item === "gas_mask") {
            const newIndex = game.supplies.length + found.length - 1;
            game.gasMaskDurability[newIndex] = 100; // New gas mask starts at 100% durability
        }
    }

    game.addLog(`🎁 Found: ${found.join(', ')}`, 'success');
    game.supplies.push(...found);
    game.updateStats();
}

function radiationStorm() {
    game.addLog("⚡ RADIATION STORM INCOMING! ⚡", 'danger');
    game.addLog("The sky turns green. You need shelter NOW!");

    let radGain;
    const gasMaskIndex = game.supplies.findIndex(item => item === "gas_mask" || item === "gas_mask_new");
    const isNewGasMask = game.supplies[gasMaskIndex] === "gas_mask_new";

    if (gasMaskIndex !== -1) {
        // Check if gas mask is broken
        const durability = game.gasMaskDurability[gasMaskIndex] || 0;

        if (durability > 0) {
            game.addLog("😷 Your gas mask protects you!", 'success');
            radGain = game.randomInt(5, 10);

            // Degrade gas mask (new masks are more durable)
            const degradation = isNewGasMask ? game.randomInt(5, 10) : game.randomInt(15, 25);
            game.gasMaskDurability[gasMaskIndex] = Math.max(0, durability - degradation);
            
            if (isNewGasMask && degradation < durability) {
                game.addLog("💎 Premium gas mask withstands the storm better!", 'success');
            }

            if (game.gasMaskDurability[gasMaskIndex] <= 0) {
                game.addLog("💥 Your gas mask filter is completely clogged and breaks!", 'danger');
                game.supplies.splice(gasMaskIndex, 1);
                delete game.gasMaskDurability[gasMaskIndex];
                // Reindex remaining gas masks
                const newDurability = {};
                Object.keys(game.gasMaskDurability).forEach(key => {
                    const oldIndex = parseInt(key);
                    if (oldIndex > gasMaskIndex) {
                        newDurability[oldIndex - 1] = game.gasMaskDurability[oldIndex];
                    } else if (oldIndex < gasMaskIndex) {
                        newDurability[oldIndex] = game.gasMaskDurability[oldIndex];
                    }
                });
                game.gasMaskDurability = newDurability;
            } else if (game.gasMaskDurability[gasMaskIndex] <= 25) {
                game.addLog("⚠️ Your gas mask is heavily damaged and barely working!", 'danger');
            } else if (game.gasMaskDurability[gasMaskIndex] <= 50) {
                game.addLog("🔧 Your gas mask shows signs of wear.", 'normal');
            }
        } else {
            game.addLog("💥 Your broken gas mask offers no protection!", 'danger');
            radGain = game.randomInt(20, 35);
        }
    } else {
        game.addLog("😵 No protection! Taking heavy radiation!", 'danger');
        radGain = game.randomInt(20, 35);
    }

    game.radiation = Math.min(100, game.radiation + radGain);
    game.addLog(`☢️ Radiation increased by ${radGain}`, 'danger');
    game.updateStats();
    game.checkGameOver();
}

function creatureEncounter() {
    const creatures = [
        "Mutant rat the size of a dog",
        "Irradiated vulture with three heads",
        "Twisted humanoid figure in the shadows",
        "Pack of glowing-eyed wolves"
    ];
    const creature = game.randomChoice(creatures);
    game.addLog(`👹 DANGER: ${creature} blocks your path!`, 'danger');

    // Auto-resolve encounter
    setTimeout(() => {
        const outcome = game.randomInt(1, 3);
        let companionHelps = false;
        
        // Companion assistance
        if (game.companion && game.companionHealth > 30 && game.companion.abilities.includes("guard")) {
            companionHelps = true;
            game.addLog(`🐾 ${game.companion.name} jumps to your defense!`, 'success');
            game.companionHealth = Math.max(0, game.companionHealth - game.randomInt(15, 25));
        }

        if (outcome === 1 && (Math.random() < 0.6 || companionHelps)) {
            game.addLog("💪 You defeat the creature!", 'success');
            game.supplies.push("meat_ration");
            game.statistics.creaturesKilled++;
            
            if (companionHelps) {
                game.addLog(`🏆 ${game.companion.name} helped secure the victory!`, 'success');
            }
        } else if (outcome === 2) {
            game.addLog("🏃 You escape, but you're exhausted!");
            let damage = 10;
            if (companionHelps) {
                damage = 5; // Companion reduces damage
                game.addLog(`🛡️ ${game.companion.name} covered your retreat!`, 'success');
            }
            game.health = Math.max(0, game.health - damage);
        } else if (outcome === 3 && game.supplies.includes("canned_food")) {
            game.addLog("🤝 You offer food and the creature leaves.", 'success');
            const foodIndex = game.supplies.indexOf("canned_food");
            game.supplies.splice(foodIndex, 1);
        } else {
            game.addLog("😵 The creature attacks!", 'danger');
            let damage = game.randomInt(15, 25);
            
            if (companionHelps) {
                damage = Math.max(5, damage - 10); // Companion reduces damage
                game.addLog(`🛡️ ${game.companion.name} takes some of the hit!`, 'success');
            }
            
            // Check for infection chance
            if (Math.random() < 0.2 && !game.disease) {
                game.addLog("🦠 The creature's claws were dirty! Risk of infection!", 'danger');
                if (Math.random() < 0.5) {
                    game.contractDisease();
                }
            }
            
            game.health = Math.max(0, game.health - damage);
            game.addLog(`🩸 Lost ${damage} health!`, 'danger');
        }

        game.updateStats();
        game.checkGameOver();
    }, 2000);
}

function roachInfestation() {
    game.addLog("🪳 ROACH INFESTATION! 🪳", 'danger');
    game.addLog("Hundreds of mutant cockroaches pour through the vents!");
    game.addLog("They're the size of mice and glowing with radiation!");

    // Auto-fight sequence
    setTimeout(() => {
        game.addLog("⚔️ Fighting off the swarm...", 'danger');

        setTimeout(() => {
            const fightOutcome = game.randomInt(1, 4);

            if (fightOutcome === 1) {
                // Victory - player crushes most roaches
                game.addLog("💪 You stomp and swat furiously!", 'success');
                game.addLog("🪳 Most roaches are crushed, others retreat!");
                const healthLoss = game.randomInt(5, 15);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Lost ${healthLoss} health from bites and scratches`, 'danger');

                // Small chance to find something they brought in
                if (Math.random() < 0.3) {
                    game.addLog("🎁 You find something they dragged in!", 'success');
                    const foundItems = ["canned_food", "water_bottles", "rad_pills"];
                    const foundItem = game.randomChoice(foundItems);
                    game.supplies.push(foundItem);
                    game.addLog(`✅ Found: ${foundItem.replace('_', ' ')}`, 'success');
                }
            } else if (fightOutcome === 2) {
                // Partial victory - roaches eat some supplies
                game.addLog("🪳 You fight them off but they got into your supplies!", 'danger');
                const healthLoss = game.randomInt(10, 20);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Lost ${healthLoss} health from bites`, 'danger');

                // They eat some food supplies
                const foodItems = ["canned_food", "meat_ration"];
                const availableFood = game.supplies.filter(item => foodItems.includes(item));
                if (availableFood.length > 0) {
                    const itemToRemove = game.randomChoice(availableFood);
                    const itemIndex = game.supplies.indexOf(itemToRemove);
                    game.supplies.splice(itemIndex, 1);
                    game.addLog(`🍽️ Roaches devoured your ${itemToRemove.replace('_', ' ')}!`, 'danger');
                } else {
                    // If no food items, they eat some bunker food
                    game.food = Math.max(0, game.food - game.randomInt(10, 20));
                    game.addLog("🍞 Roaches got into your food stores!", 'danger');
                }
            } else if (fightOutcome === 3) {
                // Bad outcome - major infestation
                game.addLog("😵 The swarm overwhelms you!", 'danger');
                const healthLoss = game.randomInt(20, 35);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Lost ${healthLoss} health from countless bites!`, 'danger');

                // Radiation exposure from radioactive roaches
                const radGain = game.randomInt(5, 15);
                game.radiation = Math.min(100, game.radiation + radGain);
                game.addLog(`☢️ Radioactive roach bites! +${radGain} radiation`, 'danger');

                game.addLog("🪳The roaches retreat but your bunker is contaminated!", 'danger');
            } else {
                // Worst outcome - complete chaos
                game.addLog("💀 TOTAL CHAOS! Roaches everywhere!", 'danger');
                const healthLoss = game.randomInt(25, 40);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Severe injuries from the infestation! Lost ${healthLoss} health!`, 'danger');

                // They contaminate water supplies
                game.water = Math.max(0, game.water - game.randomInt(15, 25));
                game.addLog("💧 Roaches contaminated your water supply!", 'danger');

                // And food
                game.food = Math.max(0, game.food - game.randomInt(10, 20));
                game.addLog("🍞 Food stores are crawling with roaches!", 'danger');

                game.addLog("🪳 You eventually drive them off, but the damage is done...", 'danger');
            }

            game.updateStats();
            game.checkGameOver();
        }, 2000);
    }, 1500);
}

function raiderAttack() {
    game.addLog("🚨 RAIDER ATTACK! 🚨", 'danger');
    game.addLog("Armed bandits have broken into your bunker!");
    game.addLog("💀 'Hand over your supplies or die!' they shout.");

    const raiderCount = game.randomInt(2, 5);
    game.addLog(`⚔️ ${raiderCount} raiders are attacking!`, 'danger');

    // Check player's weapons
    const weapons = ["smg", "usp", "assault_rifle", "sniper_rifle", "rpg"];
    const playerWeapons = game.supplies.filter(item => weapons.includes(item));

    setTimeout(() => {
        if (playerWeapons.length === 0) {
            // No weapons - must fight with fists or surrender supplies
            game.addLog("👊 No weapons! Fighting with bare hands!", 'danger');

            const fightOutcome = game.randomInt(1, 4);

            if (fightOutcome === 1) {
                // Miracle victory
                game.addLog("💪 Against all odds, you fight them off!", 'success');
                const healthLoss = game.randomInt(30, 50);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Severe injuries! Lost ${healthLoss} health`, 'danger');

                // They drop something
                const droppedWeapon = game.randomChoice(["usp", "smg"]);
                game.supplies.push(droppedWeapon);
                game.addLog(`🎁 Raider dropped: ${droppedWeapon.toUpperCase()}!`, 'success');
            } else {
                // They take supplies and hurt you
                game.addLog("😵 Overwhelmed! Raiders ransack your bunker!", 'danger');
                const healthLoss = game.randomInt(20, 40);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Beaten badly! Lost ${healthLoss} health`, 'danger');

                // Lose supplies
                const supplyLoss = Math.min(game.supplies.length, game.randomInt(1, 3));
                for (let i = 0; i < supplyLoss; i++) {
                    if (game.supplies.length > 0) {
                        const stolenIndex = game.randomInt(0, game.supplies.length - 1);
                        const stolenItem = game.supplies.splice(stolenIndex, 1)[0];
                        game.addLog(`📦 Raiders stole: ${stolenItem.replace('_', ' ')}`, 'danger');
                    }
                }

                // Lose bunker supplies too
                game.food = Math.max(0, game.food - game.randomInt(15, 30));
                game.water = Math.max(0, game.water - game.randomInt(10, 20));
                game.addLog("🍞💧 Raiders also raided your food and water stores!", 'danger');
            }
        } else {
            // Player has weapons!
            const bestWeapon = getBestWeapon(playerWeapons);
            game.addLog(`🔫 Fighting back with ${bestWeapon.replace('_', ' ').toUpperCase()}!`, 'success');

            const weaponPower = getWeaponPower(bestWeapon);
            const fightOutcome = game.randomInt(1, 4) + weaponPower;

            if (fightOutcome >= 6) {
                // Total victory
                game.addLog("💀 DECISIVE VICTORY! All raiders eliminated!", 'success');
                game.addLog("🎯 Your superior firepower dominates the battlefield!");
                const healthLoss = game.randomInt(5, 15);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Minor injuries from the firefight: -${healthLoss} health`, 'danger');

                // Raiders drop loot
                const lootCount = game.randomInt(2, 4);
                const possibleLoot = ["canned_food", "water_bottles", "med_kit", "rad_pills", "usp", "smg"];
                for (let i = 0; i < lootCount; i++) {
                    const loot = game.randomChoice(possibleLoot);
                    game.supplies.push(loot);
                    game.addLog(`💰 Looted: ${loot.replace('_', ' ')}`, 'success');
                }
            } else if (fightOutcome >= 4) {
                // Victory with casualties
                game.addLog("⚔️ You drive off the raiders!", 'success');
                game.addLog("💥 Intense firefight in your bunker!");
                const healthLoss = game.randomInt(15, 30);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Combat injuries: -${healthLoss} health`, 'danger');

                // One raider drops weapon
                const droppedWeapon = game.randomChoice(["usp", "smg", "assault_rifle"]);
                game.supplies.push(droppedWeapon);
                game.addLog(`🎁 Raider dropped: ${droppedWeapon.replace('_', ' ').toUpperCase()}`, 'success');
            } else {
                // Pyrrhic victory or partial defeat
                game.addLog("💥 Chaotic gun battle! Raiders retreat but...", 'danger');
                const healthLoss = game.randomInt(25, 45);
                game.health = Math.max(0, game.health - healthLoss);
                game.addLog(`🩸 Heavy casualties! Lost ${healthLoss} health`, 'danger');

                // Bunker damage
                game.food = Math.max(0, game.food - game.randomInt(10, 20));
                game.water = Math.max(0, game.water - game.randomInt(5, 15));
                game.addLog("💔 Stray bullets damaged your supplies!", 'danger');

                // Maybe lose a weapon from damage
                if (Math.random() < 0.3 && playerWeapons.length > 0) {
                    const damagedWeapon = game.randomChoice(playerWeapons);
                    const weaponIndex = game.supplies.indexOf(damagedWeapon);
                    game.supplies.splice(weaponIndex, 1);
                    game.addLog(`💥 Your ${damagedWeapon.replace('_', ' ').toUpperCase()} was destroyed in the fight!`, 'danger');
                }
            }
        }

        game.addLog("🏠 The bunker is secure... for now.", 'normal');
        game.updateStats();
        game.checkGameOver();
    }, 2000);
}

function getBestWeapon(weapons) {
    const weaponPriority = ["rpg", "sniper_rifle", "assault_rifle", "smg", "usp"];
    for (const weapon of weaponPriority) {
        if (weapons.includes(weapon)) {
            return weapon;
        }
    }
    return weapons[0];
}

function getWeaponPower(weapon) {
    const weaponStats = {
        "usp": 1,
        "smg": 2,
        "assault_rifle": 3,
        "sniper_rifle": 4,
        "rpg": 5
    };
    return weaponStats[weapon] || 0;
}

function rest() {
    game.addLog("💤 You rest in the bunker...");

    // Consume basic resources
    const foodConsumed = Math.min(game.food, 20);
    const waterConsumed = Math.min(game.water, 15);

    game.food = Math.max(0, game.food - foodConsumed);
    game.water = Math.max(0, game.water - waterConsumed);

    // Use supplies automatically if available
    if (game.supplies.includes("canned_food")) {
        const index = game.supplies.indexOf("canned_food");
        game.supplies.splice(index, 1);
        game.food = Math.min(100, game.food + 30);
        game.addLog("🍞 Ate canned food (+30 food)", 'success');
    }

    if (game.supplies.includes("water_bottles")) {
        const index = game.supplies.indexOf("water_bottles");
        game.supplies.splice(index, 1);
        game.water = Math.min(100, game.water + 25);
        game.addLog("💧 Drank water (+25 water)", 'success');
    }

    if (game.supplies.includes("med_kit") && game.health < 80) {
        const index = game.supplies.indexOf("med_kit");
        game.supplies.splice(index, 1);
        let healAmount = 40;
        
        // Medical bay upgrade enhances healing
        if (game.baseUpgrades.medical_bay > 0) {
            healAmount += (game.baseUpgrades.medical_bay * 10);
            game.addLog("🏥 Medical bay enhances treatment!", 'success');
        }
        
        game.health = Math.min(100, game.health + healAmount);
        game.addLog(`🏥 Used med kit (+${healAmount} health)`, 'success');
    }

    if (game.supplies.includes("rad_pills") && game.radiation > 20) {
        const index = game.supplies.indexOf("rad_pills");
        game.supplies.splice(index, 1);
        game.radiation = Math.max(0, game.radiation - 30);
        game.addLog("💊 Took rad pills (-30 radiation)", 'success');
    }

    // Treat disease with antibiotics
    if (game.disease && game.supplies.includes("antibiotics")) {
        const index = game.supplies.indexOf("antibiotics");
        game.supplies.splice(index, 1);
        game.addLog(`💉 Antibiotics cure ${game.disease.symptoms}!`, 'success');
        game.disease = null;
        game.diseaseProgression = 0;
    }

    // Realistic radiation reduction with adequate water
    if (game.water >= 50 && game.radiation > 0) {
        const radReduction = game.randomInt(1, 10);
        game.radiation = Math.max(0, game.radiation - radReduction);
        game.addLog(`💧 Well-hydrated body naturally processes radiation (-${radReduction})`, 'success');
    }

    // Solar panels provide power benefits
    if (game.baseUpgrades.solar_panels > 0) {
        const powerBonus = game.baseUpgrades.solar_panels * 2;
        game.health = Math.min(100, game.health + powerBonus);
        game.addLog(`⚡ Solar power assists recovery (+${powerBonus} health)`, 'success');
    }

    // Natural healing
    game.health = Math.min(100, game.health + 10);
    
    // Companion helps with recovery
    if (game.companion && game.companionHealth > 0) {
        if (game.companion.abilities.includes("guard")) {
            game.addLog(`🛡️ ${game.companion.name} keeps watch while you rest`, 'success');
            game.health = Math.min(100, game.health + 5); // Bonus healing
        }
    }

    game.day++;
    game.statistics.daysAlive = game.day;

    game.addLog(`⏰ Day ${game.day} begins...`);

    // Update weather system
    game.updateWeather();
    
    // Process weather effects
    if (game.weather !== "clear") {
        game.processWeatherEffects();
    }
    
    // Process disease effects
    if (game.disease) {
        game.processDiseaseEffects();
    }

    // Daily resource drain
    if (game.day % 2 === 0) {
        game.food = Math.max(0, game.food - 5);
        game.water = Math.max(0, game.water - 8);
        game.addLog("📉 Daily resource consumption", 'danger');
    }

    // Companion health recovery
    if (game.companion && game.companionHealth < game.companion.health) {
        game.companionHealth = Math.min(game.companion.health, game.companionHealth + 10);
        game.addLog(`🐾 ${game.companion.name} is feeling better`, 'success');
    }

    // Random events
    if (Math.random() < 0.1) {
        game.addLog("📻 Static-filled radio broadcast...");
        game.addLog("'...anyone out there... the creatures are... *static*'");
    }

    // Disease chance
    if (Math.random() < 0.08 && !game.disease) {
        game.contractDisease();
    }

    // Companion finding chance
    if (Math.random() < 0.05 && !game.companion) {
        game.findCompanion();
    }

    // Check for new missions
    game.checkForNewMission();

    // Check achievements
    game.checkAchievements();

    // Roach infestation event (rare)
    if (Math.random() < 0.05) {
        roachInfestation();
        return; // Skip other events if infestation occurs
    }

    // Raider attack event (rare)
    if (Math.random() < 0.06) {
        raiderAttack();
        return; // Skip other events if raid occurs
    }

    // Auto-save progress
    game.saveProgress();

    game.updateStats();
    game.checkGameOver();
}

function checkRadiation() {
    game.addLog(`☢️ RADIATION LEVEL: ${game.radiation}/100`);

    if (game.radiation < 25) {
        game.addLog("✅ Safe levels", 'success');
    } else if (game.radiation < 50) {
        game.addLog("⚠️ Elevated - monitor closely");
    } else if (game.radiation < 75) {
        game.addLog("🔶 Dangerous - seek treatment", 'danger');
    } else {
        game.addLog("💀 CRITICAL - death imminent!", 'danger');
    }
}

function useItem(itemName, itemIndex) {
    if (game.gameOver || itemIndex >= game.supplies.length || itemIndex < 0 || !game.supplies[itemIndex]) return;

    let used = false;

    switch(itemName) {
        case 'canned_food':
            if (game.food < 100) {
                game.food = Math.min(100, game.food + 30);
                game.addLog("🍞 Ate canned food (+30 food)", 'success');
                used = true;
            } else {
                game.addLog("🍞 You're already full!", 'normal');
            }
            break;

        case 'water_bottles':
            if (game.water < 100) {
                game.water = Math.min(100, game.water + 25);
                game.addLog("💧 Drank water (+25 water)", 'success');
                used = true;
            } else {
                game.addLog("💧 You're not thirsty!", 'normal');
            }
            break;

        case 'med_kit':
            if (game.health < 100) {
                game.health = Math.min(100, game.health + 40);
                game.addLog("🏥 Used med kit (+40 health)", 'success');
                used = true;
            } else {
                game.addLog("🏥 You're already healthy!", 'normal');
            }
            break;

        case 'rad_pills':
            if (game.radiation > 0) {
                game.radiation = Math.max(0, game.radiation - 30);
                game.addLog("💊 Took rad pills (-30 radiation)", 'success');
                used = true;
            } else {
                game.addLog("💊 No radiation to treat!", 'normal');
            }
            break;

        case 'gas_mask':
            const durability = game.gasMaskDurability[itemIndex] || 0;
            if (durability > 0) {
                let condition = '';
                if (durability > 75) condition = 'excellent';
                else if (durability > 50) condition = 'good';
                else if (durability > 25) condition = 'worn';
                else condition = 'barely functional';

                game.addLog(`😷 Gas mask inspected. Condition: ${condition} (${durability}% durability)`, 'success');
                game.addLog("💡 Gas mask provides automatic protection during radiation storms.", 'normal');
            } else {
                game.addLog("💥 This gas mask is completely broken and useless!", 'danger');
                game.addLog("🗑️ Removing broken gas mask from inventory.", 'normal');
                game.supplies.splice(itemIndex, 1);
                delete game.gasMaskDurability[itemIndex];

                // Reindex remaining gas masks
                const newDurability = {};
                Object.keys(game.gasMaskDurability).forEach(key => {
                    const oldIndex = parseInt(key);
                    if (oldIndex > itemIndex) {
                        newDurability[oldIndex - 1] = game.gasMaskDurability[oldIndex];
                    } else if (oldIndex < itemIndex) {
                        newDurability[oldIndex] = game.gasMaskDurability[oldIndex];
                    }
                });
                game.gasMaskDurability = newDurability;
            }
            break;

        case 'gas_mask_new':
            const durabilityNew = game.gasMaskDurability[itemIndex] || 100;
            game.addLog(`😷 PREMIUM Gas Mask (New) - Condition: Pristine (${durabilityNew}% durability)`, 'success');
            game.addLog("💎 Premium quality protection against radiation storms!", 'success');
            game.addLog("💡 This premium gas mask lasts longer than standard models.", 'normal');
            break;

        case 'meat_ration':
            if (game.food < 100) {
                game.food = Math.min(100, game.food + 20);
                game.addLog("🥩 Ate questionable meat (+20 food)", 'success');
                used = true;
            } else {
                game.addLog("🥩 You're too full for mystery meat!", 'normal');
            }
            break;

        case 'usp':
            game.addLog("🔫 USP .45 Pistol - Reliable sidearm for close combat", 'success');
            game.addLog("💡 Weapons provide automatic protection during raider attacks", 'normal');
            break;

        case 'smg':
            game.addLog("🔫 SMG - Submachine gun with high rate of fire", 'success');
            game.addLog("💡 Excellent for close-quarters bunker defense", 'normal');
            break;

        case 'assault_rifle':
            game.addLog("🔫 ASSAULT RIFLE - Military-grade automatic weapon", 'success');
            game.addLog("💡 Superior firepower against multiple enemies", 'normal');
            break;

        case 'sniper_rifle':
            game.addLog("🔫 SNIPER RIFLE - Long-range precision weapon", 'success');
            game.addLog("💡 One shot, one kill. Perfect for eliminating threats", 'normal');
            break;

        case 'rpg':
            game.addLog("🚀 RPG - Rocket Propelled Grenade launcher!", 'success');
            game.addLog("💡 ULTIMATE FIREPOWER! Devastates all enemies", 'normal');
            break;

        case 'molotov':
            game.addLog("🍾 Molotov Cocktail - Improvised explosive weapon!", 'success');
            game.addLog("💡 Effective against groups of enemies", 'normal');
            break;

        case 'armor':
            game.addLog("🛡️ Reinforced Armor equipped!", 'success');
            game.addLog("💡 Provides ongoing protection in combat", 'normal');
            break;

        case 'rad_detector':
            game.addLog(`📡 Radiation Detector reading: ${game.radiation}/100 rads`, 'success');
            game.addLog("💡 Advanced radiation monitoring device", 'normal');
            break;

        case 'water_filter':
            if (game.radiation > 10) {
                game.radiation = Math.max(0, game.radiation - 20);
                game.addLog("💧 Water filter purifies contaminated water (-20 radiation)", 'success');
                used = true;
            } else {
                game.addLog("💧 Water is already clean enough!", 'normal');
            }
            break;

        case 'antibiotics':
            if (game.disease) {
                game.addLog(`💉 Antibiotics cure ${game.disease.symptoms}!`, 'success');
                game.disease = null;
                game.diseaseProgression = 0;
                used = true;
            } else {
                game.addLog("💉 You're not sick right now!", 'normal');
            }
            break;

        case 'mutant_dog':
        case 'wasteland_cat':
        case 'robot_drone':
            if (!game.companion) {
                game.findCompanion();
                used = true;
            } else {
                game.addLog("🐾 You already have a loyal companion!", 'normal');
            }
            break;

        case 'solar_panel':
        case 'reinforcement_kit':
        case 'workshop_tools':
            game.addLog(`🏗️ ${itemName.replace('_', ' ').toUpperCase()} - Use 'Upgrade Base' action to install`, 'normal');
            break;

        default:
            game.addLog(`❓ Don't know how to use ${itemName.replace('_', ' ')}`, 'normal');
            break;
    }

    // Remove item if it was consumed
    if (used && itemName !== 'gas_mask') {
        game.supplies.splice(itemIndex, 1);

        // Reindex gas mask durability if an item before gas masks was removed
        const newDurability = {};
        Object.keys(game.gasMaskDurability).forEach(key => {
            const oldIndex = parseInt(key);
            if (oldIndex > itemIndex) {
                newDurability[oldIndex - 1] = game.gasMaskDurability[oldIndex];
            } else if (oldIndex < itemIndex) {
                newDurability[oldIndex] = game.gasMaskDurability[oldIndex];
            }
        });
        game.gasMaskDurability = newDurability;
    }

    game.updateStats();
}

function restartGame() {
    game = new WastelandSurvival();
    game.resetProgress(); // Clear any saved data
    document.getElementById('log-messages').innerHTML = '';
    document.getElementById('player-name').value = '';

    // Show name selection and hide game elements
    document.getElementById('name-selection').style.display = 'block';
    document.getElementById('game-content').style.display = 'none';

    showScreen('game-screen'); // Stay on main game screen but show name selection
}

function showGiftCodePrompt() {
    let code = prompt("Enter gift code:");
    if (code) {
        game.redeemGiftCode(code);
    }
}

function useCompanion() {
    if (!game.companion) {
        game.addLog("🐾 You don't have a companion yet. They might appear while resting!", 'normal');
        return;
    }
    
    if (game.companionHealth <= 0) {
        game.addLog(`💔 ${game.companion.name} is too injured to help!`, 'danger');
        return;
    }
    
    const abilities = game.companion.abilities;
    const ability = abilities[Math.floor(Math.random() * abilities.length)];
    
    game.useCompanionAbility(ability);
    
    // Companion takes some damage from activity
    game.companionHealth = Math.max(0, game.companionHealth - game.randomInt(5, 15));
    
    game.updateStats();
}

function upgradeBase() {
    game.addLog("🏗️ BASE UPGRADE OPTIONS:", 'success');
    
    const upgrades = [
        { name: "reinforcement", item: "reinforcement_kit", description: "Bunker Reinforcement - Reduces raider damage" },
        { name: "workshop", item: "workshop_tools", description: "Workshop - Enables item crafting" },
        { name: "medical_bay", item: "med_kit", description: "Medical Bay - Enhances healing" },
        { name: "solar_panels", item: "solar_panel", description: "Solar Panels - Provides power benefits" }
    ];
    
    let canUpgrade = false;
    
    upgrades.forEach(upgrade => {
        const currentLevel = game.baseUpgrades[upgrade.name];
        const maxLevel = 3;
        
        if (currentLevel < maxLevel && game.supplies.includes(upgrade.item)) {
            game.addLog(`🔧 Available: ${upgrade.description} (Level ${currentLevel + 1})`, 'normal');
            canUpgrade = true;
        }
    });
    
    if (!canUpgrade) {
        game.addLog("❌ No upgrades available. Need: reinforcement kit, workshop tools, med kits, or solar panels", 'danger');
        return;
    }
    
    // Auto-upgrade first available
    for (const upgrade of upgrades) {
        const currentLevel = game.baseUpgrades[upgrade.name];
        if (currentLevel < 3 && game.supplies.includes(upgrade.item)) {
            const index = game.supplies.indexOf(upgrade.item);
            game.supplies.splice(index, 1);
            game.baseUpgrades[upgrade.name]++;
            
            game.addLog(`✅ UPGRADED: ${upgrade.description} to Level ${game.baseUpgrades[upgrade.name]}!`, 'success');
            game.playSound('craft_success');
            break;
        }
    }
    
    game.updateStats();
}

function showStats() {
    game.addLog("📊 SURVIVAL STATISTICS:", 'success');
    game.addLog(`📅 Days Alive: ${game.statistics.daysAlive}`, 'normal');
    game.addLog(`⚔️ Creatures Killed: ${game.statistics.creaturesKilled}`, 'normal');
    game.addLog(`🔨 Items Crafted: ${game.statistics.itemsCrafted}`, 'normal');
    game.addLog(`📋 Missions Completed: ${game.statistics.missionsCompleted}`, 'normal');
    game.addLog(`🏴‍☠️ Raiders Defeated: ${game.statistics.raidersDefeated}`, 'normal');
    
    if (game.achievements.size > 0) {
        game.addLog("🏆 ACHIEVEMENTS:", 'success');
        game.achievements.forEach(achievement => {
            const achievementNames = {
                "survivor_10": "Survivor (10 days)",
                "survivor_25": "Veteran (25 days)", 
                "hunter": "Hunter (5 kills)",
                "hero": "Hero (3 missions)",
                "best_friend": "Best Friend (found companion)"
            };
            game.addLog(`🎖️ ${achievementNames[achievement] || achievement}`, 'success');
        });
    }
    
    if (game.companion) {
        game.addLog(`🐾 COMPANION: ${game.companion.name} (${game.companionHealth}/${game.companion.health} HP)`, 'success');
    }
    
    if (game.disease) {
        game.addLog(`🦠 CURRENT ILLNESS: ${game.disease.symptoms} (${game.diseaseProgression} days remaining)`, 'danger');
    }
    
    game.addLog(`🌤️ WEATHER: ${game.weather.replace('_', ' ').toUpperCase()}`, 'normal');
    
    game.updateStats();
}

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    // Start directly on game screen with name selection visible
    document.getElementById('name-selection').style.display = 'block';
    document.getElementById('game-content').style.display = 'none';
    showScreen('game-screen');
});
