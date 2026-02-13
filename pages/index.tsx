'use client'

import { useEffect, useRef, useState } from 'react'

export const metadata = {
  title: 'CrashMod',
  description: 'CrashMod — лучшие моды и хаки для игр',
  openGraph: {
    title: 'CrashMod',
    description: 'CrashMod — лучшие моды и хаки для игр',
    url: 'https://crashmod.example.com',
    siteName: 'CrashMod',
    images: [{ url: '/logo.png', width: 800, height: 600 }],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CrashMod',
    description: 'CrashMod — лучшие моды и хаки для игр',
    images: ['/logo.png'],
  },
}

export default function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mobileControls = useRef({ left: false, right: false, shoot: false })

  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const [gameOverUI, setGameOverUI] = useState(false)

  useEffect(() => {
    if (!started) return

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const isMobile = window.innerWidth < 768
    const scale = isMobile ? 0.6 : 0.85
    const mobileBottomOffset = isMobile ? 100 : 0 // место для кнопок снизу

    /* ===== IMAGES ===== */
    const shipImg = new Image()
    const alienImg = new Image()
    const asteroidImg = new Image()
    shipImg.src = '/game/spaceship.png'
    alienImg.src = '/game/alien.png'
    asteroidImg.src = '/game/asteroid.png'
    ctx.imageSmoothingEnabled = true

    /* ===== SOUNDS ===== */
    const shootSound = new Audio('/sounds/shoot.mp3')
    shootSound.volume = 0.5

    /* ===== GAME STATE ===== */
    let lives = 5
    let score = 0
    let level = 1
    let gameOver = false
    let shootCD = 0
    const HUD_H = 70

    const S = () => ({
      ship: 64 * scale,
      asteroid: 72 * scale,
      alienW: 140 * scale,
      alienH: 90 * scale,
      bulletW: 6 * scale,
      bulletH: 16 * scale,
    })
    let sizes = S()

    const player = {
      x: canvas.width / 2 - sizes.ship / 2,
      y: canvas.height - sizes.ship - 30 - mobileBottomOffset,
      w: sizes.ship,
      h: sizes.ship,
      speed: (isMobile ? 6 : 8) * scale,
    }

    type Obj = {
      x: number
      y: number
      w: number
      h: number
      hp?: number
      speed?: number
      dir?: number
      cd?: number
    }

    const bullets: Obj[] = []
    const asteroids: Obj[] = []
    const aliens: Obj[] = []
    const enemyBullets: Obj[] = []

    const keys: Record<string, boolean> = {}
    const kd = (e: KeyboardEvent) => (keys[e.code] = true)
    const ku = (e: KeyboardEvent) => (keys[e.code] = false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const hit = (a: Obj, b: Obj) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

    const spawnAsteroid = () => {
      if (isMobile && Math.random() > 0.6) return
      asteroids.push({
        x: Math.random() * (canvas.width - sizes.asteroid),
        y: HUD_H,
        w: sizes.asteroid,
        h: sizes.asteroid,
        hp: 4,
        speed: (isMobile ? 1.5 : 2.6) + level * 0.3,
      })
    }

    const spawnAlien = () => {
      aliens.length = 0
      aliens.push({
        x: canvas.width / 2 - sizes.alienW / 2,
        y: HUD_H + 15,
        w: sizes.alienW,
        h: sizes.alienH,
        hp: 20,
        dir: 1,
        speed: (isMobile ? 1 : 1.8) + level * 0.1,
        cd: 60,
      })
    }

    spawnAlien()

    const shoot = () => {
      bullets.push({
        x: player.x + player.w / 2 - sizes.bulletW / 2,
        y: player.y,
        w: sizes.bulletW,
        h: sizes.bulletH,
        speed: 10,
      })

      // звук при каждом выстреле
      shootSound.currentTime = 0
      shootSound.play()
    }

    function update() {
      if (gameOver) return
      if (shootCD > 0) shootCD--

      if ((keys.ArrowLeft || mobileControls.current.left) && player.x > 0) player.x -= player.speed
      if ((keys.ArrowRight || mobileControls.current.right) && player.x + player.w < canvas.width)
        player.x += player.speed

      if ((keys.Space || mobileControls.current.shoot) && shootCD === 0) {
        shoot()
        shootCD = 6 // быстрее повтор при удержании
      }

      if (Math.random() < 0.02 + level * 0.003) spawnAsteroid()

      bullets.forEach(b => (b.y -= b.speed!))
      asteroids.forEach(a => (a.y += a.speed!))
      enemyBullets.forEach(b => (b.y += b.speed!))

      aliens.forEach(a => {
        a.x += a.speed! * a.dir!
        if (a.x <= 0 || a.x + a.w >= canvas.width) a.dir! *= -1
        a.cd!--
        if (a.cd! <= 0) {
          enemyBullets.push({ x: a.x + a.w / 2, y: a.y + a.h, w: 6, h: 16, speed: 5 })
          a.cd = 60
        }
      })

      bullets.forEach((b, bi) => {
        asteroids.forEach((a, ai) => {
          if (hit(b, a)) {
            a.hp!--
            bullets.splice(bi, 1)
            if (a.hp! <= 0) {
              score++
              asteroids.splice(ai, 1)
            }
          }
        })
        aliens.forEach((al, ai) => {
          if (hit(b, al)) {
            al.hp!--
            bullets.splice(bi, 1)
            if (al.hp! <= 0) {
              score += 2
              aliens.splice(ai, 1)
            }
          }
        })
      })

      asteroids.forEach((a, i) => {
        if (hit(a, player)) {
          lives--
          asteroids.splice(i, 1)
        }
      })

      enemyBullets.forEach((b, i) => {
        if (hit(b, player)) {
          lives--
          enemyBullets.splice(i, 1)
        }
      })

      if (score >= level * 10) {
        level++
        spawnAlien()
      }

      if (lives <= 0) {
        gameOver = true
        setGameOverUI(true)
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      sizes = S()

      // HUD
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, canvas.width, HUD_H)
      ctx.fillStyle = 'white'
      ctx.font = '20px Arial'
      ctx.fillText(`❤️ ${lives}`, 20, 45)
      ctx.fillText(`LVL ${level}`, canvas.width / 2 - 30, 45)
      ctx.fillText(`🎯 ${score}`, canvas.width - 120, 45)

      if (shipImg.complete) ctx.drawImage(shipImg, player.x, player.y, player.w, player.h)
      asteroids.forEach(a => { if (asteroidImg.complete) ctx.drawImage(asteroidImg, a.x, a.y, a.w, a.h) })
      aliens.forEach(a => { if (alienImg.complete) ctx.drawImage(alienImg, a.x, a.y, a.w, a.h) })

      bullets.forEach(b => { ctx.fillStyle = 'yellow'; ctx.fillRect(b.x, b.y, b.w, b.h) })
      enemyBullets.forEach(b => { ctx.fillStyle = 'orange'; ctx.fillRect(b.x, b.y, b.w, b.h) })

      if (gameOver) {
        ctx.textAlign = 'center'
        ctx.fillStyle = 'red'
        ctx.font = '52px Arial'
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2)
      }
    }

    const loop = () => {
      update()
      draw()
      requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [started, restartKey])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'black', overflow: 'hidden' }}>
      {!started && <button style={btn} onClick={() => setStarted(true)}>🚀 START</button>}

      {gameOverUI && (
        <button
          style={{ ...btn, top: '60%' }}
          onClick={() => { setRestartKey(v => v + 1); setGameOverUI(false); setStarted(true) }}
        >
          🔁 ИГРАТЬ СНОВА
        </button>
      )}

      <canvas ref={canvasRef} />

      {/* MOBILE CONTROLS */}
      {typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div style={mobilePanel}>
          <button
            style={ctrlBtn}
            onTouchStart={() => (mobileControls.current.left = true)}
            onTouchEnd={() => (mobileControls.current.left = false)}
          >
            ◀
          </button>
          <button
            style={ctrlBtn}
            onTouchStart={() => (mobileControls.current.shoot = true)}
            onTouchEnd={() => (mobileControls.current.shoot = false)}
          >
            🔥
          </button>
          <button
            style={ctrlBtn}
            onTouchStart={() => (mobileControls.current.right = true)}
            onTouchEnd={() => (mobileControls.current.right = false)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  padding: '18px 50px',
  fontSize: 22,
  zIndex: 10,
}

const mobilePanel: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  left: 0,
  width: '100%',
  display: 'flex',
  justifyContent: 'space-around',
  zIndex: 20,
}

const ctrlBtn: React.CSSProperties = {
  width: 70,
  height: 70,
  fontSize: 28,
  borderRadius: '50%',
  background: '#222',
  color: '#fff',
  border: '2px solid #555',
}
