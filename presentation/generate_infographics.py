#!/usr/bin/env python3
"""
Generate crisp, non-AI scientific vector infographics for SPHEREx & Planet X presentation.
Uses mathematically accurate formulas, coordinate scaling, and clean SVG design.
"""
import os
import math
import subprocess

OUT_DIR = "/home/yierke/mnt/extra/Sphere-X-port/presentation/assets"
os.makedirs(OUT_DIR, exist_ok=True)

def make_solar_system_svg():
    width = 1600
    height = 900
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080d1e"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="{width}" height="{height}" fill="url(#bgGrad)"/>
  
  <!-- Grid overlay -->
  <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.4">
    {''.join([f'<line x1="{x}" y1="0" x2="{x}" y2="{height}"/>' for x in range(0, width, 80)])}
    {''.join([f'<line x1="0" y1="{y}" x2="{width}" y2="{y}"/>' for y in range(0, height, 80)])}
  </g>

  <!-- Header -->
  <text x="80" y="80" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="2">CELESTIAL MECHANICS &amp; DETECTION THRESHOLDS</text>
  <text x="80" y="125" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800">Outer Solar System Kinematics at 400 AU</text>

  <!-- Central Axis / Distance Axis -->
  <line x1="120" y1="360" x2="1480" y2="360" stroke="#334155" stroke-width="3" stroke-dasharray="6,6"/>

  <!-- Sun -->
  <circle cx="160" cy="360" r="42" fill="url(#sunGrad)" filter="url(#glow)"/>
  <text x="160" y="435" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">Sun</text>
  <text x="160" y="458" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">0 AU</text>

  <!-- Earth -->
  <circle cx="340" cy="360" r="10" fill="#38bdf8"/>
  <text x="340" y="405" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Earth</text>
  <text x="340" y="426" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">1 AU · 29.8 km/s</text>

  <!-- Jupiter -->
  <circle cx="560" cy="360" r="18" fill="#fb923c"/>
  <text x="560" y="405" fill="#fb923c" font-family="system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Jupiter</text>
  <text x="560" y="426" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">5.2 AU · 13.1 km/s</text>

  <!-- Neptune -->
  <circle cx="820" cy="360" r="14" fill="#818cf8"/>
  <text x="820" y="405" fill="#818cf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Neptune</text>
  <text x="820" y="426" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">30 AU · 5.4 km/s</text>

  <!-- Kuiper Belt boundary indicator -->
  <line x1="940" y1="280" x2="940" y2="440" stroke="#475569" stroke-width="2" stroke-dasharray="4,4"/>
  <text x="940" y="265" fill="#64748b" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">Kuiper Belt (30-50 AU)</text>

  <!-- Planet X Candidate -->
  <circle cx="1300" cy="360" r="16" fill="#f43f5e" filter="url(#glow)"/>
  <text x="1300" y="405" fill="#f43f5e" font-family="system-ui, sans-serif" font-size="16" font-weight="800" text-anchor="middle">Planet X / eTNO</text>
  <text x="1300" y="428" fill="#fda4af" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">400 AU · 1.49 km/s</text>

  <!-- Proper Motion Arrow -->
  <path d="M 1300,320 L 1360,320" stroke="#f43f5e" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="1330" y="305" fill="#f43f5e" font-family="system-ui, sans-serif" font-size="13" font-weight="700" text-anchor="middle">μ = 0.77"/yr</text>

  <!-- CARDS SECTION -->

  <!-- Card 1: Sub-pixel Motion -->
  <rect x="80" y="520" width="440" height="310" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1.5"/>
  <text x="110" y="565" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="18" font-weight="700">1. Sub-Pixel Shift Challenge</text>
  
  <text x="110" y="605" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="15">6-month proper motion:</text>
  <text x="110" y="635" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="700">Δθ = μ · Δt = 0.385 arcsec</text>

  <text x="110" y="675" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="15">SPHEREx detector pixel scale:</text>
  <text x="110" y="705" fill="#38bdf8" font-family="monospace" font-size="20" font-weight="700">s = 6.20 arcsec / pixel</text>

  <rect x="110" y="730" width="380" height="70" rx="8" fill="#0f172a" stroke="#0284c7" stroke-width="1"/>
  <text x="130" y="758" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Displacement per survey epoch:</text>
  <text x="130" y="785" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="16" font-weight="800">Shift = 0.062 pixels (&lt; 1/16th of a pixel)</text>

  <!-- Card 2: Inverse 4th Power Law -->
  <rect x="580" y="520" width="440" height="310" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1.5"/>
  <text x="610" y="565" fill="#fb923c" font-family="system-ui, sans-serif" font-size="18" font-weight="700">2. Extreme Flux Attenuation</text>

  <text x="610" y="605" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="15">Reflected optical sunlight:</text>
  <text x="610" y="635" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="700">F_refl ∝ L_sun · R_p² / d⁴</text>

  <text x="610" y="675" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">At 400 AU, reflected sunlight drops by:</text>
  <text x="610" y="705" fill="#fb923c" font-family="monospace" font-size="20" font-weight="700">(400)⁴ ≈ 2.56 × 10¹⁰</text>

  <rect x="610" y="730" width="380" height="70" rx="8" fill="#0f172a" stroke="#ea580c" stroke-width="1"/>
  <text x="630" y="758" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Equilibrium temperature:</text>
  <text x="630" y="785" fill="#fb923c" font-family="system-ui, sans-serif" font-size="16" font-weight="800">T_eq ≈ 279 K / √d ≈ 14 K (requires IR)</text>

  <!-- Card 3: SPHEREx Solution -->
  <rect x="1080" y="520" width="440" height="310" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1.5"/>
  <text x="1110" y="565" fill="#4ade80" font-family="system-ui, sans-serif" font-size="18" font-weight="700">3. The SPHEREx Multi-Epoch Key</text>

  <text x="1110" y="605" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="15">Thermal emission drops only as 1/d²:</text>
  <text x="1110" y="635" fill="#f8fafc" font-family="monospace" font-size="20" font-weight="700">F_thermal ∝ B_λ(T) · R_p² / d²</text>

  <text x="1110" y="675" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">SPHEREx 102 channels (0.75 - 5.0 μm):</text>
  <text x="1110" y="705" fill="#4ade80" font-family="monospace" font-size="20" font-weight="700">Bands 4-6 capture thermal peak</text>

  <rect x="1110" y="730" width="380" height="70" rx="8" fill="#0f172a" stroke="#16a34a" stroke-width="1"/>
  <text x="1130" y="758" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Detection method:</text>
  <text x="1130" y="785" fill="#4ade80" font-family="system-ui, sans-serif" font-size="16" font-weight="800">Difference Imaging reveals Dipole</text>
</svg>'''
    return svg

def make_dipole_svg():
    width = 1600
    height = 900
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080d1e"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <rect width="{width}" height="{height}" fill="url(#bgGrad)"/>
  
  <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.4">
    {''.join([f'<line x1="{x}" y1="0" x2="{x}" y2="{height}"/>' for x in range(0, width, 80)])}
    {''.join([f'<line x1="0" y1="{y}" x2="{width}" y2="{y}"/>' for y in range(0, height, 80)])}
  </g>

  <!-- Header -->
  <text x="80" y="80" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">MATHEMATICAL PHYSICS OF IMAGE SUBTRACTION</text>
  <text x="80" y="125" fill="#ffffff" font-family="system-ui, sans-serif" font-size="34" font-weight="800">Formation of the Antisymmetric Difference Dipole</text>

  <!-- Mathematical Derivation Banner -->
  <rect x="80" y="160" width="1440" height="90" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="110" y="198" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="600">FIRST-ORDER TAYLOR SERIES EXPANSION FOR SUB-PIXEL MOTION (δx &lt;&lt; FWHM):</text>
  <text x="110" y="232" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="700">ΔI(x) = I₂(x) - I₁(x) = f(x - δx) - f(x) ≈ -δx · [df/dx] + O(|δx|²)</text>

  <!-- Left Column: Epoch Profiles -->
  <!-- Box 1: Epoch 1 -->
  <rect x="80" y="280" width="440" height="260" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1.5"/>
  <text x="110" y="320" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="18" font-weight="700">Epoch 1: Base Point Source PSF</text>
  <text x="110" y="348" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Object centered at x = 0: f(x) ∝ exp(-x² / 2σ²)</text>
  
  <!-- Curve 1 (Gaussian at center) -->
  <g transform="translate(110, 370)">
    <line x1="0" y1="130" x2="380" y2="130" stroke="#475569" stroke-width="1.5"/>
    <line x1="190" y1="10" x2="190" y2="140" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
    <path d="M 40,130 C 130,130 150,20 190,20 C 230,20 250,130 340,130" fill="none" stroke="#38bdf8" stroke-width="3.5"/>
    <circle cx="190" cy="20" r="5" fill="#38bdf8"/>
    <text x="190" y="152" fill="#94a3b8" font-family="monospace" font-size="12" text-anchor="middle">x = 0</text>
  </g>

  <!-- Box 2: Epoch 2 -->
  <rect x="80" y="560" width="440" height="260" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#334155" stroke-width="1.5"/>
  <text x="110" y="600" fill="#a855f7" font-family="system-ui, sans-serif" font-size="18" font-weight="700">Epoch 2: Shifted Point Source</text>
  <text x="110" y="628" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Object shifted by proper motion δx: f(x - δx)</text>

  <!-- Curve 2 (Gaussian shifted right) -->
  <g transform="translate(110, 650)">
    <line x1="0" y1="130" x2="380" y2="130" stroke="#475569" stroke-width="1.5"/>
    <line x1="190" y1="10" x2="190" y2="140" stroke="#475569" stroke-width="1" stroke-dasharray="3,3"/>
    <line x1="225" y1="10" x2="225" y2="140" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="3,3"/>
    <path d="M 75,130 C 165,130 185,20 225,20 C 265,20 285,130 375,130" fill="none" stroke="#a855f7" stroke-width="3.5"/>
    <circle cx="225" cy="20" r="5" fill="#a855f7"/>
    <text x="225" y="152" fill="#a855f7" font-family="monospace" font-size="12" text-anchor="middle">x = +δx</text>
  </g>

  <!-- Right: The Signed Difference Image Result -->
  <rect x="560" y="280" width="960" height="540" rx="12" fill="#1e293b" fill-opacity="0.8" stroke="#0284c7" stroke-width="2"/>
  <text x="600" y="325" fill="#4ade80" font-family="system-ui, sans-serif" font-size="22" font-weight="800">Result: Antisymmetric Dipole Feature (I₂ - I₁)</text>
  <text x="600" y="355" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="15">Static background stars cancel completely (ΔI = 0). Sub-pixel mover produces derivative signature.</text>

  <!-- Large Dipole Curve Graphic -->
  <g transform="translate(620, 390)">
    <!-- Zero axis -->
    <line x1="0" y1="170" x2="840" y2="170" stroke="#64748b" stroke-width="2"/>
    <text x="850" y="175" fill="#64748b" font-family="monospace" font-size="14">ΔI = 0 (Background)</text>

    <!-- Negative Trough (left) -->
    <path d="M 120,170 C 200,170 230,280 290,280 C 350,280 380,170 420,170" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" stroke-width="4"/>
    <circle cx="290" cy="280" r="6" fill="#ef4444"/>
    <text x="290" y="315" fill="#f87171" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">Negative Flux Trough (-F)</text>
    <text x="290" y="338" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">Position at Epoch 1</text>

    <!-- Center Zero Crossing -->
    <circle cx="420" cy="170" r="5" fill="#ffffff"/>
    <text x="420" y="150" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">Zero-crossing inflection</text>

    <!-- Positive Peak (right) -->
    <path d="M 420,170 C 460,170 490,60 550,60 C 610,60 640,170 720,170" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" stroke-width="4"/>
    <circle cx="550" cy="60" r="6" fill="#22c55e"/>
    <text x="550" y="40" fill="#4ade80" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">Positive Flux Peak (+F)</text>
    <text x="550" y="85" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">Position at Epoch 2</text>

    <!-- Motion vector indicator -->
    <line x1="290" y1="365" x2="550" y2="365" stroke="#f59e0b" stroke-width="3" stroke-dasharray="6,6"/>
    <polygon points="555,365 540,358 540,372" fill="#f59e0b"/>
    <text x="420" y="390" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="14" font-weight="700" text-anchor="middle">Proper Motion Vector δx (Orientation encodes direction)</text>
  </g>

  <!-- Bottom Metric Callouts -->
  <g transform="translate(600, 715)">
    <rect x="0" y="0" width="280" height="75" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <text x="15" y="28" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Peak-to-Trough Amplitude:</text>
    <text x="15" y="55" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="700">A_dipole ∝ δx · (F_peak / σ_PSF)</text>

    <rect x="300" y="0" width="280" height="75" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <text x="315" y="28" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Noise in Difference Frame:</text>
    <text x="315" y="55" fill="#f59e0b" font-family="monospace" font-size="16" font-weight="700">σ_diff = √(σ₁² + σ₂²) ≈ 1.414 · σ₀</text>

    <rect x="600" y="0" width="280" height="75" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <text x="615" y="28" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Detection Criterion:</text>
    <text x="615" y="55" fill="#4ade80" font-family="monospace" font-size="16" font-weight="700">SNR = Peak / σ_diff ≥ 5.0 σ</text>
  </g>
</svg>'''
    return svg

def make_architecture_svg():
    width = 1600
    height = 900
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080d1e"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
  </defs>

  <rect width="{width}" height="{height}" fill="url(#bgGrad)"/>
  
  <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.4">
    {''.join([f'<line x1="{x}" y1="0" x2="{x}" y2="{height}"/>' for x in range(0, width, 80)])}
    {''.join([f'<line x1="0" y1="{y}" x2="{width}" y2="{y}"/>' for y in range(0, height, 80)])}
  </g>

  <!-- Header -->
  <text x="80" y="80" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="20" font-weight="700" letter-spacing="2">END-TO-END COMPUTATIONAL PIPELINE</text>
  <text x="80" y="125" fill="#ffffff" font-family="system-ui, sans-serif" font-size="34" font-weight="800">SPHEREx Scientific Photometry Architecture</text>

  <!-- Top Flow: 4 Sequential Processing Stages -->

  <!-- Stage 1 -->
  <rect x="80" y="180" width="320" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="80" y="180" width="320" height="42" rx="12" fill="#0f172a"/>
  <text x="100" y="208" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700">1. INGESTION &amp; WCS</text>
  
  <text x="100" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">SPHEREx L2 Products</text>
  <text x="100" y="278" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• 2048 x 2048 FITS multi-extension</text>
  <text x="100" y="302" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Surface Brightness (MJy/sr)</text>
  <text x="100" y="326" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Caltech IRSA TAP API integration</text>
  <text x="100" y="350" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• WCS coordinate projection (TAN)</text>
  <text x="100" y="385" fill="#38bdf8" font-family="monospace" font-size="12">Pixel scale: 6.20"/px pitch</text>

  <!-- Connector 1-2 -->
  <line x1="400" y1="300" x2="450" y2="300" stroke="#38bdf8" stroke-width="3" marker-end="url(#arr)"/>

  <!-- Stage 2 -->
  <rect x="450" y="180" width="320" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="450" y="180" width="320" height="42" rx="12" fill="#0f172a"/>
  <text x="470" y="208" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700">2. CORE PHOTOMETRY</text>

  <text x="470" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">Sub-Pixel Integration</text>
  <text x="470" y="278" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• 10 x 10 sub-sampling grid</text>
  <text x="470" y="302" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Concentric sky annulus (4.0 - 7.0 px)</text>
  <text x="470" y="326" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• MAD iterative sigma clipping:</text>
  <text x="470" y="350" fill="#4ade80" font-family="monospace" font-size="13">  σ_MAD = 1.4826 · median(|Δ|)</text>
  <text x="470" y="385" fill="#38bdf8" font-family="monospace" font-size="12">1% Synthetic recovery verified</text>

  <!-- Connector 2-3 -->
  <line x1="770" y1="300" x2="820" y2="300" stroke="#38bdf8" stroke-width="3" marker-end="url(#arr)"/>

  <!-- Stage 3 -->
  <rect x="820" y="180" width="320" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="820" y="180" width="320" height="42" rx="12" fill="#0f172a"/>
  <text x="840" y="208" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="15" font-weight="700">3. CALIBRATION &amp; SED</text>

  <text x="840" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">Mission v28 CBE Ground Truth</text>
  <text x="840" y="278" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Effective FWHM curve (4.61" - 6.87")</text>
  <text x="840" y="302" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Curve-of-growth flux correction</text>
  <text x="840" y="326" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• 102-channel LVF array extraction</text>
  <text x="840" y="350" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Unit conversion: μJy, mJy, AB mag</text>
  <text x="840" y="385" fill="#38bdf8" font-family="monospace" font-size="12">Full error propagation (Poisson+Sky)</text>

  <!-- Connector 3-4 -->
  <line x1="1140" y1="300" x2="1190" y2="300" stroke="#38bdf8" stroke-width="3" marker-end="url(#arr)"/>

  <!-- Stage 4 -->
  <rect x="1190" y="180" width="330" height="240" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="1190" y="180" width="330" height="42" rx="12" fill="#0f172a"/>
  <text x="1210" y="208" fill="#4ade80" font-family="system-ui, sans-serif" font-size="15" font-weight="700">4. DISCOVERY &amp; EXPORT</text>

  <text x="1210" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="700">Multi-Epoch Differencing</text>
  <text x="1210" y="278" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Multi-epoch blink comparator</text>
  <text x="1210" y="302" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Signed difference dipole tagging</text>
  <text x="1210" y="326" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Cross-match: Gaia DR3 &amp; NEOSSat</text>
  <text x="1210" y="350" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• NASA FITS Standard 4.0 BINTABLE</text>
  <text x="1210" y="385" fill="#4ade80" font-family="monospace" font-size="12">Validated by astropy &amp; CFITSIO</text>

  <!-- Bottom Architecture Stack -->
  <rect x="80" y="470" width="1440" height="350" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1.5"/>
  <text x="110" y="515" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="20" font-weight="700">Application Architecture &amp; Deployment Topology</text>

  <!-- Left: Frontend Layer -->
  <rect x="110" y="540" width="440" height="250" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
  <text x="135" y="575" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="16" font-weight="700">CLIENT LAYER (React + TypeScript)</text>
  <text x="135" y="605" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Win32 Windows 2000 ergonomics (zero web bloat)</text>
  <text x="135" y="630" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• HTML5 Canvas FITS visualizer with 8 colormaps</text>
  <text x="135" y="655" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Interactive reticle with real-time coordinate readout</text>
  <text x="135" y="680" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• 1-4 epoch blinking animator (1-10 Hz)</text>
  <text x="135" y="705" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Spectral energy distribution modal via Chart.js</text>
  <text x="135" y="735" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Deployment: Vercel + GitHub Pages</text>

  <!-- Middle: Backend & Execution Layer -->
  <rect x="580" y="540" width="440" height="250" rx="8" fill="#0f172a" stroke="#a855f7" stroke-width="1"/>
  <text x="605" y="575" fill="#a855f7" font-family="system-ui, sans-serif" font-size="16" font-weight="700">SERVER &amp; PIPELINE (Node.js + C)</text>
  <text x="605" y="605" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Memory-bounded streaming FITS parser</text>
  <text x="605" y="630" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Concurrent worker pool for batch aperture jobs</text>
  <text x="605" y="655" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Headless CLI mode for automated shell scripts</text>
  <text x="605" y="680" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• 2880-byte block padded NASA BINTABLE builder</text>
  <text x="605" y="705" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Automated disk cache indexing &amp; local staging</text>
  <text x="605" y="735" fill="#a855f7" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Deployment: Hugging Face Spaces + Docker</text>

  <!-- Right: Survey & Database Integrations -->
  <rect x="1050" y="540" width="440" height="250" rx="8" fill="#0f172a" stroke="#4ade80" stroke-width="1"/>
  <text x="1075" y="575" fill="#4ade80" font-family="system-ui, sans-serif" font-size="16" font-weight="700">DATA INTEROPERABILITY</text>
  <text x="1075" y="605" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• NASA/IPAC Infrared Science Archive (IRSA)</text>
  <text x="1075" y="630" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• ESA Gaia Data Release 3 (proper motions)</text>
  <text x="1075" y="655" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• CSA NEOSSat Near-Earth Asteroid orbits</text>
  <text x="1075" y="680" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• WISE / NEOWISE 15-year baseline baseline cross-links</text>
  <text x="1075" y="705" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">• Formats: FITS BINTABLE, CSV, JSON, PNG</text>
  <text x="1075" y="735" fill="#4ade80" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Open-source &amp; 100% reproducible</text>
</svg>'''
    return svg

def main():
    svgs = {
        "diagram_solar_system.svg": make_solar_system_svg(),
        "diagram_dipole.svg": make_dipole_svg(),
        "diagram_architecture.svg": make_architecture_svg()
    }
    for filename, content in svgs.items():
        svg_path = os.path.join(OUT_DIR, filename)
        png_path = os.path.join(OUT_DIR, filename.replace(".svg", ".png"))
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(content)
        # convert to high-res PNG
        subprocess.run(["rsvg-convert", "-w", "1600", "-h", "900", svg_path, "-o", png_path], check=True)
        print(f"Generated {png_path}")

if __name__ == "__main__":
    main()
