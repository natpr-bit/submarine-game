// =========================================================
// sonar.ts — Short-Range Tactical Sonar & Stationary Targets
// Requires: movement.ts
// =========================================================

namespace BathysphereSonar {
    export interface AbyssalObject {
        name: string
        screenX: number     // Fixed horizontal screen position (14 to 136)
        depth: number       // Fixed depth in meters (0 to 2600)
        revealed: boolean   // True once hit by a sonar ping
        scanned: boolean    // True once the submarine flies close to log it
        isBeacon: boolean
        color: number
    }

    // --- Sonar State & Tight Radius Settings ---
    export let active = false
    export let radius = 0
    export let originX = 80
    export let originY = 58
    export let cooldown = 0
    export let scannedCount = 0
    export let beaconScanned = false
    export let lastEventBanner = ""
    export let bannerTimer = 0

    const MAX_RADIUS = 52       // Short-range sonar pulse (~1/3 of screen width)
    const PING_COOLDOWN = 45    // Longer recharge between pings
    const EXPAND_SPEED = 2.6

    // --- 6 Stationary Abyssal Artifacts + Research Beacon at 2,550 m ---
    export let targets: AbyssalObject[] = [
        { name: "Sunken Buoy", screenX: 34, depth: 280, revealed: false, scanned: false, isBeacon: false, color: 4 },
        { name: "Giant Squid", screenX: 122, depth: 680, revealed: false, scanned: false, isBeacon: false, color: 2 },
        { name: "Hydrothermal Vent", screenX: 28, depth: 1150, revealed: false, scanned: false, isBeacon: false, color: 5 },
        { name: "Whale Fall", screenX: 118, depth: 1620, revealed: false, scanned: false, isBeacon: false, color: 13 },
        { name: "Manganese Nodules", screenX: 42, depth: 2050, revealed: false, scanned: false, isBeacon: false, color: 11 },
        { name: "Abyssal Drone", screenX: 126, depth: 2320, revealed: false, scanned: false, isBeacon: false, color: 7 },
        { name: "RESEARCH BEACON", screenX: 80, depth: 2550, revealed: false, scanned: false, isBeacon: true, color: 5 }
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

    // Fire a short-range active sonar pulse from the submarine's current position
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

    // Bind [A] button (Z / Space on keyboard) directly to fire a sonar ping
    controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
        ping()
    })

    // Step sonar ring expansion and proximity artifact scanning
    export function update() {
        if (cooldown > 0) cooldown--
        if (bannerTimer > 0) bannerTimer--

        let subDepth = BathysphereMovement.subDepth
        let subScreenX = Math.round(BathysphereMovement.subSprite.x)
        let subScreenY = Math.round(BathysphereMovement.subSprite.y)

        // 1. Expand short-range sonar ring & reveal stationary objects within range
        if (active) {
            radius += EXPAND_SPEED
            for (let obj of targets) {
                let sx = obj.screenX
                let sy = subScreenY + Math.round((obj.depth - subDepth) * 0.25)
                let dx = sx - originX
                let dy = sy - originY
                let dist = Math.sqrt(dx * dx + dy * dy)

                if (!obj.revealed && dist <= MAX_RADIUS && Math.abs(dist - radius) < 8) {
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
                let dx = Math.abs(obj.screenX - subScreenX)
                let dd = Math.abs(obj.depth - subDepth)
                if (dx < 16 && dd < 28) {
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

    // Draw compact sonar rings, stationary targets, and beacon indicator
    export function draw(img: Image) {
        let subDepth = BathysphereMovement.subDepth
        let subScreenY = Math.round(BathysphereMovement.subSprite.y)

        // 1. Compact High-Contrast Expanding Sonar Wave Rings
        if (active) {
            let r = Math.round(radius)
            img.drawCircle(originX, originY, r, 7)          // Bright Green outer ring
            if (r > 8) {
                img.drawCircle(originX, originY, r - 6, 6)  // Cyan inner echo ring
            }
        }

        // 2. Render Stationary Hidden Blips & Revealed Artifacts
        for (let obj of targets) {
            let sx = obj.screenX
            let sy = subScreenY + Math.round((obj.depth - subDepth) * 0.25)

            if (sx >= 8 && sx <= 142 && sy >= 15 && sy <= 107) {
                if (obj.revealed) {
                    let c = obj.scanned ? 7 : obj.color
                    if (obj.isBeacon) {
                        img.fillRect(sx - 4, sy - 6, 9, 12, c)
                        img.drawRect(sx - 6, sy - 8, 13, 16, 1)
                        if (Math.idiv(game.runtime(), 250) % 2 == 0) {
                            img.fillCircle(sx, sy - 9, 2, 2)
                        }
                        img.print("BEACON", sx - 17, sy + 10, 1, image.font5)
                    } else {
                        img.fillCircle(sx, sy, 4, c)
                        img.drawCircle(sx, sy, 6, obj.scanned ? 7 : 1)
                        if (!obj.scanned) {
                            img.print("?", sx - 2, sy - 12, 5, image.font5)
                        }
                    }
                } else {
                    // Faint unrevealed stationary sonar blip dot
                    img.setPixel(sx, sy, 11)
                }
            }
        }

        // 3. Beacon Distance & Direction Readout (top-left below header)
        let beacon = targets[6]
        let dDepth = Math.round(beacon.depth - subDepth)
        if (Math.abs(dDepth) > 35) {
            let arrow = dDepth > 0 ? "v" : "^"
            img.print("BCN:" + Math.abs(dDepth) + "m" + arrow, 3, 18, 5, image.font5)
        }
    }

    // Self-running update & paint hooks
    game.onUpdate(function () {
        update()
    })

    scene.createRenderable(5, function (target: Image, camera: scene.Camera) {
        draw(target)
    })
}