// =========================================================
// sonar.ts — Bathysphere Active Sonar & Abyssal Target Detection
// Requires: movement.ts
// =========================================================

namespace BathysphereSonar {
    export interface AbyssalObject {
        name: string
        x: number           // World X (-240 to +240)
        depth: number       // Depth in meters (0 to 2600)
        revealed: boolean   // True once hit by a sonar ping
        scanned: boolean    // True once the submarine flies close to log it
        isBeacon: boolean
        color: number
    }

    // --- Sonar State ---
    export let active = false
    export let radius = 0
    export let originX = 80
    export let originY = 58
    export let cooldown = 0
    export let scannedCount = 0
    export let beaconScanned = false
    export let lastEventBanner = ""
    export let bannerTimer = 0

    const MAX_RADIUS = 135
    const PING_COOLDOWN = 45
    const EXPAND_SPEED = 4.2

    // --- 6 Hidden Abyssal Artifacts + Research Beacon at 2,550 m ---
    export let targets: AbyssalObject[] = [
        { name: "Sunken Buoy", x: -85, depth: 320, revealed: false, scanned: false, isBeacon: false, color: 4 },
        { name: "Giant Squid", x: 110, depth: 740, revealed: false, scanned: false, isBeacon: false, color: 2 },
        { name: "Hydrothermal Vent", x: -130, depth: 1180, revealed: false, scanned: false, isBeacon: false, color: 5 },
        { name: "Whale Fall", x: 75, depth: 1620, revealed: false, scanned: false, isBeacon: false, color: 13 },
        { name: "Manganese Nodules", x: -60, depth: 2050, revealed: false, scanned: false, isBeacon: false, color: 11 },
        { name: "Abyssal Drone", x: 140, depth: 2320, revealed: false, scanned: false, isBeacon: false, color: 7 },
        { name: "RESEARCH BEACON", x: 0, depth: 2550, revealed: false, scanned: false, isBeacon: true, color: 5 }
    ]

    export function reset() {
        active = false
        radius = 0
        cooldown = 0
        scannedCount = 0
        beaconScanned = false
        lastEventBanner = ""
        bannerTimer = 0

        for (let obj of targets) {
            obj.revealed = false
            obj.scanned = false
        }
    }

    // Fire an active sonar pulse from the yellow submarine's current screen position
    export function ping(): boolean {
        if (cooldown > 0) return false
        active = true
        radius = 6
        originX = Math.round(BathysphereMovement.subSprite.x)
        originY = Math.round(BathysphereMovement.subSprite.y)
        cooldown = PING_COOLDOWN

        music.playTone(880, 60)
        music.playTone(1320, 90)
        return true
    }

    // Bind [A] button directly to fire a sonar ping
    controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
        ping()
    })

    // Step sonar ring expansion and proximity artifact scanning
    export function update() {
        if (cooldown > 0) cooldown--
        if (bannerTimer > 0) bannerTimer--

        let subX = BathysphereMovement.subX
        let subDepth = BathysphereMovement.subDepth
        let subScreenX = Math.round(BathysphereMovement.subSprite.x)
        let subScreenY = Math.round(BathysphereMovement.subSprite.y)

        // 1. Expand active sonar ring & reveal objects intersecting the wave front
        if (active) {
            radius += EXPAND_SPEED
            for (let obj of targets) {
                let sx = subScreenX + Math.round((obj.x - subX) * 0.75)
                let sy = subScreenY + Math.round((obj.depth - subDepth) * 0.25)
                let dx = sx - originX
                let dy = sy - originY
                let dist = Math.sqrt(dx * dx + dy * dy)

                if (!obj.revealed && Math.abs(dist - radius) < 10) {
                    obj.revealed = true
                    music.playTone(660, 50)
                }
            }
            if (radius >= MAX_RADIUS) {
                active = false
            }
        }

        // 2. Proximity scan check once an object has been revealed by sonar
        for (let obj of targets) {
            if (obj.revealed && !obj.scanned) {
                let dx = Math.abs(obj.x - subX)
                let dd = Math.abs(obj.depth - subDepth)
                if (dx < 26 && dd < 34) {
                    obj.scanned = true
                    music.playTone(1046, 120)
                    if (obj.isBeacon) {
                        beaconScanned = true
                        lastEventBanner = "BEACON SCANNED!"
                    } else {
                        scannedCount++
                        lastEventBanner = "FOUND: " + obj.name.toUpperCase()
                    }
                    bannerTimer = 110
                }
            }
        }
    }

    // Self-running update loop so sonar works automatically every frame
    game.onUpdate(function () {
        update()
    })

    // Draw expanding sonar rings, hidden blips, revealed artifacts, and beacon indicator
    export function draw(img: Image) {
        let subX = BathysphereMovement.subX
        let subDepth = BathysphereMovement.subDepth
        let subScreenX = Math.round(BathysphereMovement.subSprite.x)
        let subScreenY = Math.round(BathysphereMovement.subSprite.y)

        // 1. Dual Expanding Sonar Wave Rings
        if (active) {
            img.drawCircle(originX, originY, Math.round(radius), 7)
            if (radius > 14) {
                img.drawCircle(originX, originY, Math.round(radius - 8), 6)
            }
        }

        // 2. Render Hidden Blips & Revealed Artifacts
        for (let obj of targets) {
            let sx = subScreenX + Math.round((obj.x - subX) * 0.75)
            let sy = subScreenY + Math.round((obj.depth - subDepth) * 0.25)

            if (sx >= -12 && sx <= 144 && sy >= 15 && sy <= 107) {
                if (obj.revealed) {
                    let c = obj.scanned ? 7 : obj.color
                    if (obj.isBeacon) {
                        // Research Beacon at 2,550 m
                        img.fillRect(sx - 4, sy - 6, 9, 12, c)
                        img.drawRect(sx - 6, sy - 8, 13, 16, 1)
                        if (Math.idiv(game.runtime(), 250) % 2 == 0) {
                            img.fillCircle(sx, sy - 9, 2, 2)
                        }
                        img.print("BEACON", sx - 17,
