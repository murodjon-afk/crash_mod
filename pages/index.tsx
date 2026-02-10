'use client'

import { useEffect, useRef, useState } from 'react'

export default function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [newRecord, setNewRecord] = useState(false)
  const [mobileControls, setMobileControls] = useState({ left: false, right: false, shoot: false })

  useEffect(() => {
    if (!started) return

    setIsGameOver(false)
    setNewRecord(false)

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    function resizeCanvas() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // ===== DETECT MOBILE =====
    const isMobile = window.innerWidth < 768

    // ===== GAME STATE =====
    let lives = 5
    let tokens = 0
    let level = 1
    let gameOver = false
    let shootCooldown = 0

    // ===== DYNAMIC SIZES =====
    function getSizes() {
      const w = canvas.width
      const h = canvas.height
      return {
        hudHeight: Math.max(50, h * 0.08),
        playerW: Math.max(40, w * (isMobile ? 0.12 : 0.07)),
        playerH: Math.max(40, h * (isMobile ? 0.12 : 0.07)),
        bulletW: Math.max(5, w * 0.015),
        bulletH: Math.max(12, h * 0.03),
        asteroidSize: Math.max(35, w * (isMobile ? 0.08 : 0.06)),
        alienW: Math.max(80, w * (isMobile ? 0.18 : 0.15)),
        alienH: Math.max(50, h * (isMobile ? 0.12 : 0.08)),
        hudPadding: Math.max(10, w * 0.02),
        speedScale: Math.max(6, w * (isMobile ? 0.004 : 0.008)),
      }
    }

    let sizes = getSizes()

    const player = {
      x: canvas.width / 2 - sizes.playerW / 2,
      y: canvas.height - sizes.playerH - 90,
      w: sizes.playerW,
      h: sizes.playerH,
      speed: sizes.speedScale,
    }

    type Bullet = { x: number; y: number; speed: number; w?: number; h?: number }
    type Asteroid = { x: number; y: number; w: number; h: number; hp: number; speed: number }
    type Alien = { x: number; y: number; w: number; h: number; hp: number; dir: number; speed: number; cd: number }

    const bullets: Bullet[] = []
    const asteroids: Asteroid[] = []
    const aliens: Alien[] = []
    const enemyBullets: Bullet[] = []

    const keys: Record<string, boolean> = {}
    const down = (e: KeyboardEvent) => (keys[e.code] = true)
    const up = (e: KeyboardEvent) => (keys[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    const hit = (a: any, b: any) =>
      a.x < b.x + b.w &&
      a.x + (a.w || 4) > b.x &&
      a.y < b.y + b.h &&
      a.y + (a.h || 10) > b.y

    function spawnAsteroid() {
      // на мобилке меньше астероидов
      if (isMobile && Math.random() > 0.5) return
      asteroids.push({
        x: Math.random() * (canvas.width - sizes.asteroidSize),
        y: -sizes.asteroidSize,
        w: sizes.asteroidSize,
        h: sizes.asteroidSize,
        hp: 4,
        speed: 2 + level * (isMobile ? 0.15 : 0.3), // медленнее на мобилке
      })
    }

    function spawnAlien() {
      aliens.length = 0
      aliens.push({
        x: canvas.width / 2 - sizes.alienW / 2,
        y: sizes.hudHeight + 10,
        w: sizes.alienW,
        h: sizes.alienH,
        hp: 20,
        dir: 1,
        speed: 2 + level * (isMobile ? 0.05 : 0.1), // медленнее на мобилке
        cd: 60,
      })
    }

    spawnAlien()

    function shoot() {
      bullets.push({
        x: player.x + player.w / 2 - sizes.bulletW / 2,
        y: player.y,
        speed: 10,
        w: sizes.bulletW,
        h: sizes.bulletH,
      })
    }

    function update() {
      if (gameOver) return

      // MOBILE CONTROLS
      if (mobileControls.left && player.x > 0) player.x -= player.speed
      if (mobileControls.right && player.x + player.w < canvas.width) player.x += player.speed
      if (mobileControls.shoot && shootCooldown === 0) {
        shoot()
        shootCooldown = 12
      }

      if (shootCooldown > 0) shootCooldown--

      // KEYBOARD
      if (keys.ArrowLeft && player.x > 0) player.x -= player.speed
      if (keys.ArrowRight && player.x + player.w < canvas.width) player.x += player.speed
      if (keys.Space && shootCooldown === 0) {
        shoot()
        shootCooldown = 12
      }

      if (Math.random() < 0.02 + level * 0.003) spawnAsteroid()

      bullets.forEach(b => (b.y -= b.speed))
      asteroids.forEach(a => (a.y += a.speed))
      enemyBullets.forEach(b => (b.y += b.speed))

      aliens.forEach(a => {
        a.x += a.speed * a.dir
        if (a.x <= 0 || a.x + a.w >= canvas.width) a.dir *= -1

        a.cd--
        if (a.cd <= 0) {
          enemyBullets.push({
            x: a.x + a.w / 2,
            y: a.y + a.h,
            speed: 5 + level * 0.2,
            w: sizes.bulletW,
            h: sizes.bulletH,
          })
          a.cd = 60 - Math.min(level * 3, 40)
        }
      })

      for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
          if (hit(bullets[i], asteroids[j])) {
            asteroids[j].hp -= 2
            bullets.splice(i, 1)
            if (asteroids[j].hp <= 0) {
              tokens++
              asteroids.splice(j, 1)
            }
            break
          }
        }
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
          if (hit(bullets[i], aliens[j])) {
            aliens[j].hp -= 2
            bullets.splice(i, 1)
            if (aliens[j].hp <= 0) {
              tokens += 2
              aliens.splice(j, 1)
            }
            break
          }
        }
      }

      for (let i = asteroids.length - 1; i >= 0; i--) {
        if (hit(asteroids[i], player)) {
          lives--
          asteroids.splice(i, 1)
        }
      }

      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (hit(enemyBullets[i], player)) {
          lives--
          enemyBullets.splice(i, 1)
        }
      }

      if (tokens >= level * 10) {
        level++
        spawnAlien()
      }

      if (lives <= 0) {
        gameOver = true
        setIsGameOver(true)

        const bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10)
        const bestLevel = parseInt(localStorage.getItem('bestLevel') || '0', 10)

        if (tokens > bestScore || level > bestLevel) {
          localStorage.setItem('bestScore', tokens.toString())
          localStorage.setItem('bestLevel', level.toString())
          setNewRecord(true)
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sizes = getSizes() // обновляем размеры при ресайзе

      // HUD
      ctx.fillStyle = '#222'
      ctx.fillRect(0, 0, Math.min(250, canvas.width * 0.35), sizes.hudHeight)
      ctx.fillStyle = 'white'
      ctx.font = `${Math.max(16, sizes.hudHeight * 0.4)}px Arial`
      ctx.textAlign = 'start'
      ctx.fillText(`❤️ ${lives}`, sizes.hudPadding, sizes.hudHeight / 2)
      ctx.fillText(`🆙 LVL ${level}`, sizes.hudPadding, sizes.hudHeight * 0.75)
      ctx.fillText(`🎯 ${tokens}`, 120, sizes.hudHeight / 2)

      // PLAYER
      ctx.fillStyle = 'cyan'
      ctx.fillRect(player.x, player.y, player.w, player.h)

      // BULLETS
      ctx.fillStyle = 'yellow'
      bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w!, b.h!))

      // ASTEROIDS
      ctx.fillStyle = 'gray'
      asteroids.forEach(a => ctx.fillRect(a.x, a.y, a.w, a.h))

      // ALIENS
      ctx.fillStyle = 'red'
      aliens.forEach(a => ctx.fillRect(a.x, a.y, a.w, a.h))

      // ENEMY BULLETS
      ctx.fillStyle = 'orange'
      enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w!, b.h!))

      // GAME OVER
      if (gameOver) {
        ctx.fillStyle = 'red'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40)

        if (newRecord) {
          ctx.fillStyle = 'gold'
          ctx.font = '36px Arial'
          ctx.fillText(`🎉 НОВЫЙ РЕКОРД! LVL ${level} 🎯 ${tokens}`, canvas.width / 2, canvas.height / 2 + 20)
        } else {
          const bestScore = localStorage.getItem('bestScore')
          const bestLevel = localStorage.getItem('bestLevel')
          ctx.fillStyle = 'white'
          ctx.font = '28px Arial'
          ctx.fillText(`РЕКОРД: LVL ${bestLevel} 🎯 ${bestScore}`, canvas.width / 2, canvas.height / 2 + 20)
        }
      }
    }

    function loop() {
      update()
      draw()
      requestAnimationFrame(loop)
    }

    loop()

    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [started, restartKey, mobileControls])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'black' }}>
      {!started && !isGameOver && <button onClick={() => setStarted(true)} style={btnStyle}>🚀 START</button>}
      {isGameOver && (
        <button onClick={() => { setRestartKey(v => v + 1); setStarted(true) }} style={{ ...btnStyle, top: '60%' }}>
          🔁 ИГРАТЬ СНОВА
        </button>
      )}
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* MOBILE CONTROLS */}
      {started && !isGameOver && window.innerWidth < 768 && (
        <div style={mobileControlsContainer}>
          <button
            style={mobileBtn}
            onTouchStart={() => setMobileControls(c => ({ ...c, left: true }))}
            onTouchEnd={() => setMobileControls(c => ({ ...c, left: false }))}
          >⬅️</button>
          <button
            style={mobileBtn}
            onTouchStart={() => setMobileControls(c => ({ ...c, shoot: true }))}
            onTouchEnd={() => setMobileControls(c => ({ ...c, shoot: false }))}
          >🔥</button>
          <button
            style={mobileBtn}
            onTouchStart={() => setMobileControls(c => ({ ...c, right: true }))}
            onTouchEnd={() => setMobileControls(c => ({ ...c, right: false }))}
          >➡️</button>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '15px 40px',
  fontSize: 22,
  cursor: 'pointer',
  zIndex: 10,
}

const mobileControlsContainer: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 15,
  zIndex: 10,
}

const mobileBtn: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  fontSize: 24,
  opacity: 0.7,
  background: '#333',
  color: 'white',
  border: 'none',
  touchAction: 'none',
}
