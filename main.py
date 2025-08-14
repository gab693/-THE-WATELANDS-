
import random
import time
import sys

class WastelandSurvival:
    def __init__(self):
        self.player_name = ""
        self.health = 100
        self.food = 50
        self.water = 40
        self.radiation = 0
        self.supplies = []
        self.day = 1
        self.bunker_supplies = {"canned_food": 5, "water_bottles": 3, "med_kit": 2}
        self.game_over = False
        
    def display_header(self):
        print("☢️☣️" + "="*50 + "☣️☢️")
        print("          THE WASTELANDS - 2050")
        print("     Nuclear Winter Survival Game")
        print("☢️☣️" + "="*50 + "☣️☢️\n")
        
    def display_stats(self):
        print(f"\n📊 DAY {self.day} - SURVIVOR STATUS:")
        print(f"🏥 Health: {self.health}/100")
        print(f"🍞 Food: {self.food}/100")
        print(f"💧 Water: {self.water}/100")
        print(f"☢️ Radiation: {self.radiation}/100")
        print(f"🎒 Supplies: {len(self.supplies)}")
        if self.supplies:
            print(f"   Items: {', '.join(self.supplies)}")
        print("-" * 40)
        
    def intro_story(self):
        print("📡 EMERGENCY BROADCAST - DAY 1 📡")
        print("\nThe year is 2050. Nuclear war has ravaged the Earth.")
        print("You've been hiding in an underground bunker for weeks...")
        print("But supplies are running dangerously low.")
        print("\nStrange sounds echo from the wasteland above.")
        print("Something else survived the blast... and it's hunting.")
        
        self.player_name = input("\nWhat's your name, survivor? ").strip()
        if not self.player_name:
            self.player_name = "Survivor"
            
        print(f"\nWelcome to hell, {self.player_name}. Let's see how long you last...")
        time.sleep(2)
        
    def bunker_actions(self):
        print("\n🏠 BUNKER ACTIONS:")
        print("1. 🔍 Check remaining bunker supplies")
        print("2. 🚪 Venture into the wasteland")
        print("3. 💤 Rest (recover health, consume food/water)")
        print("4. 📊 Check radiation levels")
        print("5. 🚨 Emergency exit (quit game)")
        
        choice = input("\nWhat do you want to do? ").strip()
        
        if choice == "1":
            self.check_bunker_supplies()
        elif choice == "2":
            self.enter_wasteland()
        elif choice == "3":
            self.rest()
        elif choice == "4":
            self.check_radiation()
        elif choice == "5":
            self.quit_game()
        else:
            print("❌ Invalid choice. The wasteland doesn't forgive mistakes...")
            
    def check_bunker_supplies(self):
        print("\n🏪 BUNKER SUPPLY CHECK:")
        if any(self.bunker_supplies.values()):
            for item, count in self.bunker_supplies.items():
                print(f"📦 {item.replace('_', ' ').title()}: {count}")
            
            item_choice = input("\nTake what? (canned_food/water_bottles/med_kit or 'none'): ").strip().lower()
            
            if item_choice in self.bunker_supplies and self.bunker_supplies[item_choice] > 0:
                self.bunker_supplies[item_choice] -= 1
                self.supplies.append(item_choice)
                print(f"✅ Took {item_choice.replace('_', ' ')}. Added to inventory.")
            elif item_choice == "none":
                print("🤔 Saving for later... wise choice.")
            else:
                print("❌ Nothing left or invalid item.")
        else:
            print("💀 Bunker supplies completely depleted. You MUST scavenge to survive.")
            
    def enter_wasteland(self):
        print("\n🌫️ You emerge into the toxic wasteland...")
        print("The sky is a sickly yellow. Geiger counter clicks ominously.")
        
        # Random radiation exposure
        radiation_gain = random.randint(5, 15)
        self.radiation += radiation_gain
        print(f"☢️ Radiation exposure: +{radiation_gain}")
        
        # Random encounter
        encounter = random.choice([
            "scavenge_location", "mysterious_sound", "supply_cache", 
            "radiation_storm", "creature_encounter"
        ])
        
        if encounter == "scavenge_location":
            self.scavenge_location()
        elif encounter == "mysterious_sound":
            self.mysterious_sound()
        elif encounter == "supply_cache":
            self.supply_cache()
        elif encounter == "radiation_storm":
            self.radiation_storm()
        elif encounter == "creature_encounter":
            self.creature_encounter()
            
    def scavenge_location(self):
        locations = [
            "abandoned supermarket", "destroyed pharmacy", "crashed military convoy",
            "ruined gas station", "collapsed apartment building"
        ]
        location = random.choice(locations)
        print(f"\n🏪 You found a {location}...")
        
        found_items = random.choice([
            ["canned_food", "water_bottles"],
            ["med_kit"],
            ["rad_pills", "canned_food"],
            ["water_bottles", "gas_mask"],
            ["nothing"]
        ])
        
        if found_items == ["nothing"]:
            print("💀 Already picked clean. Only dust and bones remain.")
        else:
            print(f"🎁 Found: {', '.join(found_items)}")
            self.supplies.extend(found_items)
            
    def mysterious_sound(self):
        print("\n👂 You hear strange noises in the distance...")
        sounds = [
            "Metal scraping against concrete...",
            "A low, inhuman growl...",
            "Rapid clicking sounds...",
            "Heavy breathing that isn't yours..."
        ]
        print(f"🔊 {random.choice(sounds)}")
        
        choice = input("Do you investigate? (y/n): ").lower()
        if choice == 'y':
            if random.random() < 0.3:
                print("🎁 You find a hidden supply cache!")
                self.supplies.extend(["canned_food", "water_bottles"])
            else:
                print("💀 Something attacks! You barely escape!")
                self.health -= random.randint(15, 30)
                print(f"🩸 Health lost!")
        else:
            print("🏃 Smart choice. You retreat to safety.")
            
    def supply_cache(self):
        print("\n📦 You discover an emergency supply drop!")
        cache_items = ["med_kit", "rad_pills", "canned_food", "water_bottles", "gas_mask"]
        found = random.sample(cache_items, random.randint(2, 4))
        print(f"🎁 Found: {', '.join(found)}")
        self.supplies.extend(found)
        
    def radiation_storm(self):
        print("\n⚡ RADIATION STORM INCOMING! ⚡")
        print("The sky turns green. You need shelter NOW!")
        
        if "gas_mask" in self.supplies:
            print("😷 Your gas mask protects you!")
            rad_gain = random.randint(5, 10)
        else:
            print("😵 No protection! Taking heavy radiation!")
            rad_gain = random.randint(20, 35)
            
        self.radiation += rad_gain
        print(f"☢️ Radiation increased by {rad_gain}")
        
    def creature_encounter(self):
        creatures = [
            "Mutant rat the size of a dog",
            "Irradiated vulture with three heads",
            "Twisted humanoid figure in the shadows",
            "Pack of glowing-eyed wolves"
        ]
        creature = random.choice(creatures)
        print(f"\n👹 DANGER: {creature} blocks your path!")
        
        print("1. 🔫 Fight")
        print("2. 🏃 Run")
        print("3. 🥫 Offer food")
        
        choice = input("What do you do? ").strip()
        
        if choice == "1":
            if random.random() < 0.6:
                print("💪 You defeat the creature!")
                self.supplies.append("meat_ration")
            else:
                print("😵 The creature wounds you!")
                self.health -= random.randint(20, 40)
        elif choice == "2":
            print("🏃 You escape, but you're exhausted!")
            self.health -= 10
        elif choice == "3" and "canned_food" in self.supplies:
            print("🤝 The creature accepts your offering and leaves.")
            self.supplies.remove("canned_food")
        else:
            print("😵 Bad choice! The creature attacks!")
            self.health -= random.randint(15, 25)
            
    def rest(self):
        print("\n💤 You rest in the bunker...")
        
        # Consume resources
        food_consumed = min(self.food, 20)
        water_consumed = min(self.water, 15)
        
        self.food -= food_consumed
        self.water -= water_consumed
        
        # Use supplies if available
        if "canned_food" in self.supplies:
            self.supplies.remove("canned_food")
            self.food += 30
            print("🍞 Ate canned food (+30 food)")
            
        if "water_bottles" in self.supplies:
            self.supplies.remove("water_bottles")
            self.water += 25
            print("💧 Drank water (+25 water)")
            
        if "med_kit" in self.supplies and self.health < 80:
            choice = input("Use med kit to heal? (y/n): ").lower()
            if choice == 'y':
                self.supplies.remove("med_kit")
                self.health += 40
                print("🏥 Used med kit (+40 health)")
                
        if "rad_pills" in self.supplies and self.radiation > 20:
            choice = input("Take radiation pills? (y/n): ").lower()
            if choice == 'y':
                self.supplies.remove("rad_pills")
                self.radiation -= 30
                print("💊 Took rad pills (-30 radiation)")
        
        # Clamp values
        self.health = min(100, max(0, self.health + 10))
        self.food = min(100, max(0, self.food))
        self.water = min(100, max(0, self.water))
        self.radiation = min(100, max(0, self.radiation))
        
        self.day += 1
        print(f"⏰ Day {self.day} begins...")
        
    def check_radiation(self):
        print(f"\n☢️ RADIATION LEVEL: {self.radiation}/100")
        if self.radiation < 25:
            print("✅ Safe levels")
        elif self.radiation < 50:
            print("⚠️ Elevated - monitor closely")
        elif self.radiation < 75:
            print("🔶 Dangerous - seek treatment")
        else:
            print("💀 CRITICAL - death imminent!")
            
    def check_game_over(self):
        if self.health <= 0:
            print("\n💀 You died from your injuries...")
            print("The wasteland claims another soul.")
            self.game_over = True
        elif self.food <= 0 and self.water <= 0:
            print("\n💀 You died of starvation and thirst...")
            print("Your body becomes part of the wasteland.")
            self.game_over = True
        elif self.radiation >= 100:
            print("\n☢️ Radiation poisoning has consumed you...")
            print("You become one with the toxic earth.")
            self.game_over = True
            
        if self.game_over:
            print(f"\n🪦 GAME OVER - You survived {self.day} days in the wasteland.")
            print("The darkness takes you...")
            
    def quit_game(self):
        print(f"\n🚨 {self.player_name} has left the wasteland...")
        print(f"Days survived: {self.day}")
        print("Sometimes running away is the only way to survive.")
        self.game_over = True
        
    def play(self):
        self.display_header()
        self.intro_story()
        
        while not self.game_over:
            self.display_stats()
            
            # Check survival conditions
            self.check_game_over()
            if self.game_over:
                break
                
            # Random events
            if random.random() < 0.1:
                print("\n📻 Static-filled radio broadcast...")
                print("'...anyone out there... the creatures are... *static*'")
                
            self.bunker_actions()
            
            # Daily resource drain
            if self.day % 2 == 0:
                self.food = max(0, self.food - 5)
                self.water = max(0, self.water - 8)
                
        # End game
        play_again = input("\nPlay again? (y/n): ").lower()
        if play_again == 'y':
            self.__init__()
            self.play()

if __name__ == "__main__":
    game = WastelandSurvival()
    game.play()
