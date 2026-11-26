// =========================================================
// movement.ts — Self-Running Submarine Movement & Sprite
// =========================================================

namespace BathysphereMovement {
    // --- Submarine State ---
    export let subX = 0             // World X (-240 to +240)
    export let subDepth = 0         // Depth in meters (0 = surface)
    export let vx = 0               // Horizontal velocity
    export let vy = 0               // Vertical velocity (+ = sinking)
    export let ballastWater = 50    // 0% (full air) to 100% (full water); 50% = neutral
    export let facingRight = true

    // --- Yellow Submarine Pixel Art (24x16) ---
    const subImgRight = img`
        . . . . . . . . . . 5 5 5 . . . . . . . . . . .
        . . . . . . . . . . 5 1 5 . . . . . . . . . . .
        . . . . . . . . . . 5 5 . . . . . . . . . . . .
        . . . . . . . . 5 5 5 5 5 . . . . . . . . . . .
        . . . . . . . 5 5 5 5 5 5 5 . . . . . . . . . .
        . . . 4 . . 5 5 5 5 5 5 5 5 5 5 5 . . . . . . .
        . . 4 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 . . . . .
        4 4 4 5 5 5 9 9 5 5 9 9 5 5 9 9 5 5 5 5 5 . . .
        . 4 5 5 5 5 9 1 5 5 9 1 5 5 9 1 5 5 5 5 5 5 . .
        4 4 4 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 . .
        . . 4 5 5 4 4 4 4 4 4 4 4 4 4 4 4 4 5 5 5 . . .
        . . . 4 . . 5 5 5 5 5 5 5 5 5 5 5 5 5 . . . . .
        . . . . . . . . 4 4 4 4 4 4 4 4 . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
    `

    const subImgLeft = img`
        . . . . . . . . . . . 5 5 5 . . . . . . . . . .
        . . . . . . . . . . . 5 1 5 . . . . . . . . . .
        . . . . . . . . . . . . 5 5 . . . . . . . . . .
        . . . . . . . . . . 5 5 5 5 5 . . . . . . . . .
        . . . . . . . . . 5 5 5 5 5 5 5 . . . . . . . .
        . . . . . . . 5 5 5 5 5 5 5 5 5 5 5 . . 4 . . .
        . . . . . 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 4 . .
        . . . 5 5 5 5 5 9 9 5 5 9 9 5 5 9 9 5 5 5 4 4 4
        . . 5 5 5 5 5 5 9 1 5 5 9 1 5 5 9 1 5 5 5 5 4 .
        . . 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 4 4 4
        . . . 5 5 5 4 4 4 4 4 4 4 4 4 4 4 4 4 5 5 4 . .
        . . . . . 5 5 5 5 5 5 5 5 5 5 5 5 5 . . 4 . . .
        . . . . . . . . 4 4 4 4 4 4 4 4 . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
        . . . . . . . . . . . . . . . . . . . . . . . .
    `

    // --- Submarine Sprite Instance ---
    export let subSprite: Sprite = sprites.create(subImgRight, SpriteKind.Player)
    subSprite.setPosition(80, 54)
    subSprite.z = 10

    // --- Physics Constants ---
    export const WORLD_HALF_WIDTH = 240
    const PUMP_RATE = 40            // Ballast % change per second
    const MOVE_ACCEL = 140          // Horizontal thruster acceleration (px/s^2)
    const MAX_SPEED_X = 75          // Max horizontal sprite speed (px/s)
    const WATER_FRICTION = 0.90     // Smooth underwater glide when releasing keys
    const BUOYANCY_FACTOR = 0.65

    export function reset() {
        subX = 0
        subDepth = 0
        vx = 0
        vy = 0
        ballastWater = 50
        facingRight = true
        subSprite.setImage(subImgRight)
        subSprite.setPosition(80, 54)
    }

    // Emergency Ballast Purge
    export function blowBallast(): boolean {
        if (ballastWater <= 5) return false
        ballastWater = Math.max(0, ballastWater - 25)
        vy -= 6.5
        return true
    }

    // Keep update() available if main.ts calls it, without double-stepping
    let lastStepTime = -1

    export function update(dt: number = 0.033, anchorY: number = 54) {
        let now = game.runtime()
        if (now == lastStepTime) return
        lastStepTime = now

        // 1. Horizontal Movement (Left / Right Buttons)
        if (controller.left.isPressed()) {
            vx = Math.max(-MAX_SPEED_X, vx - MOVE_ACCEL * dt)
            if (facingRight) {
                facingRight = false
                subSprite.setImage(subImgLeft)
            }
        } else if (controller.right.isPressed()) {
            vx = Math.min(MAX_SPEED_X, vx + MOVE_ACCEL * dt)
            if (!facingRight) {
                facingRight = true
                subSprite.setImage(subImgRight)
            }
        } else {
            // Smooth water resistance slowdown when no left/right key is held
            vx *= WATER_FRICTION
            if (Math.abs(vx) < 0.5) vx = 0
        }

        // Move the sprite directly on screen and clamp within screen edges
        subSprite.x += vx * dt
        if (subSprite.x < 16) {
            subSprite.x = 16
            subX = Math.max(-WORLD_HALF_WIDTH, subX + vx * dt)
        } else if (subSprite.x > 136) {
            subSprite.x = 136
            subX = Math.min(WORLD_HALF_WIDTH, subX + vx * dt)
        } else {
            subX = (subSprite.x - 80) * 2
        }

        // 2. Ballast Pump Controls (Up = Pump Air / Rise, Down = Flood Water / Dive)
        if (controller.up.isPressed()) {
            ballastWater = Math.max(0, ballastWater - PUMP_RATE * dt)
        }
        if (controller.down.isPressed()) {
            ballastWater = Math.min(100, ballastWater + PUMP_RATE * dt)
        }

        // 3. Vertical Buoyancy & Depth Update
        let buoyancyForce = (ballastWater - 50) * BUOYANCY_FACTOR
        let dragY = -0.45 * vy * Math.abs(vy) - 0.75 * vy
        vy += (buoyancyForce + dragY) * dt
        subDepth += vy * dt

        if (subDepth < 0) {
            subDepth = 0
            if (vy < 0) vy = 0
        }

        // Move sprite vertically on screen based on dive/ascent velocity
        let targetY = Math.clamp(24, 96, anchorY + vy * 2.2)
        subSprite.y += (targetY - subSprite.y) * 0.2
    }

    // Automatically run movement every frame even if main.ts does not call update()
    game.onUpdate(function () {
        update(0.033, 54)
    })

    // Draw headlight beam & thruster bubbles from the sprite's live position
    export function drawEffects(img: Image) {
        let cx = Math.round(subSprite.x)
        let cy = Math.round(subSprite.y)
        let dir = facingRight ? 1 : -1

        img.drawLine(cx + dir * 10, cy, cx + dir * 26, cy - 4, 5)
        img.drawLine(cx + dir * 10, cy, cx + dir * 26, cy + 4, 5)

        if (Math.abs(vx) > 3) {
            img.setPixel(cx - dir * 13, cy + randint(-2, 2), 1)
            img.setPixel(cx - dir * 16, cy + randint(-3, 3), 6)
        }
    }
}