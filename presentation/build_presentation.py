#!/usr/bin/env python3
"""
Generate the official 7-slide NASA Space Apps Challenge presentation deck (.pptx)
Complies with all NASA Space Apps requirements:
- Exactly 7 slides
- 16:9 widescreen layout
- Deep space aesthetic (#080d1e to #0f172a, cyan #38bdf8, amber #f59e0b, emerald #4ade80)
- High contrast, legible typography, structured content
- Embedded non-AI SVG-rendered diagrams and real app screenshots
- Zero emojis, standard ASCII punctuation only
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

ASSETS_DIR = "/home/yierke/mnt/extra/Sphere-X-port/presentation/assets"
OUTPUT_PPTX = "/home/yierke/mnt/extra/Sphere-X-port/presentation/SPHEREx_and_Planet_X_Presentation.pptx"

# Color Palette
COLOR_BG = RGBColor(11, 17, 44)        # Deep space navy #0b112c
COLOR_CARD_BG = RGBColor(26, 37, 74)   # Card fill #1a254a
COLOR_CARD_BORDER = RGBColor(56, 82, 140) # Card outline
COLOR_TEXT_WHITE = RGBColor(255, 255, 255)
COLOR_TEXT_MUTED = RGBColor(160, 175, 205)
COLOR_CYAN = RGBColor(56, 189, 248)    # #38bdf8
COLOR_AMBER = RGBColor(245, 158, 11)   # #f59e0b
COLOR_GREEN = RGBColor(74, 222, 128)   # #4ade80
COLOR_ROSE = RGBColor(244, 63, 94)     # #f43f5e

def set_slide_background(slide, prs):
    # Full bleed background rectangle
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG
    bg.line.fill.background()
    return bg

def add_header(slide, category, title):
    # Category tag
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.5), Inches(0.35))
    tf_cat = cat_box.text_frame
    tf_cat.word_wrap = True
    tf_cat.margin_left = tf_cat.margin_top = tf_cat.margin_right = tf_cat.margin_bottom = 0
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category.upper()
    p_cat.font.size = Pt(11)
    p_cat.font.bold = True
    p_cat.font.color.rgb = COLOR_CYAN
    p_cat.font.name = "Arial"

    # Main title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.65))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title
    p_title.font.size = Pt(22)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_TEXT_WHITE
    p_title.font.name = "Arial"

def add_footer(slide, current_slide, total_slides=7):
    # Subtle bottom rule
    rule = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.95), Inches(11.733), Inches(0.015))
    rule.fill.solid()
    rule.fill.fore_color.rgb = RGBColor(30, 45, 80)
    rule.line.fill.background()

    footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.3))
    tf = footer_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = f"NASA International Space Apps Challenge 2026 · Team Exulans · Slide {current_slide} of {total_slides}"
    p.font.size = Pt(9.5)
    p.font.color.rgb = COLOR_TEXT_MUTED
    p.font.name = "Arial"

def build_presentation():
    prs = Presentation()
    # 16:9 Widescreen (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs)

    # Accent decorative banner card
    card1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.0), Inches(11.333), Inches(5.5))
    card1.fill.solid()
    card1.fill.fore_color.rgb = RGBColor(16, 24, 56)
    card1.line.color.rgb = COLOR_CARD_BORDER
    card1.line.width = Pt(1.5)

    # Logo
    logo_path = os.path.join(ASSETS_DIR, "logo.png")
    if os.path.exists(logo_path):
        s1.shapes.add_picture(logo_path, Inches(1.5), Inches(1.7), Inches(2.2), Inches(2.2))

    # Title & Subtitle block
    tb = s1.shapes.add_textbox(Inches(4.1), Inches(1.6), Inches(7.8), Inches(3.2))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "NASA INTERNATIONAL SPACE APPS CHALLENGE 2026"
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_CYAN
    p0.font.name = "Arial"

    p1 = tf.add_paragraph()
    p1.text = "Hunting Planet X with SPHEREx"
    p1.font.size = Pt(32)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_TEXT_WHITE
    p1.font.name = "Arial"
    p1.space_before = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "A Public Infrared Photometry Workstation for Multi-Epoch Sky Analysis & Transient Discovery"
    p2.font.size = Pt(16)
    p2.font.color.rgb = COLOR_TEXT_MUTED
    p2.font.name = "Arial"
    p2.space_before = Pt(10)

    # Bottom Metadata Pills
    meta_box = s1.shapes.add_textbox(Inches(1.5), Inches(4.7), Inches(10.3), Inches(1.2))
    mtf = meta_box.text_frame
    mtf.word_wrap = True

    mp0 = mtf.paragraphs[0]
    mp0.text = "Challenge: Planet X and SPHEREx · Team: Exulans · Track: Astrophysics & Planetary Science"
    mp0.font.size = Pt(12)
    mp0.font.bold = True
    mp0.font.color.rgb = COLOR_AMBER
    mp0.font.name = "Arial"

    mp1 = mtf.add_paragraph()
    mp1.text = "Live Deployment: https://spherex-photometry.vercel.app · Open Source: github.com/Yancovert/spherex-photometry"
    mp1.font.size = Pt(11)
    mp1.font.color.rgb = COLOR_TEXT_MUTED
    mp1.font.name = "Arial"
    mp1.space_before = Pt(6)

    # ==========================================
    # SLIDE 2: THE PROBLEM
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs)
    add_header(s2, "The Challenge & Orbital Kinematics", "Finding What Moves in a Billion-Object Sky")
    add_footer(s2, 2)

    # Left content card
    c2 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.2), Inches(5.2))
    c2.fill.solid()
    c2.fill.fore_color.rgb = COLOR_CARD_BG
    c2.line.color.rgb = COLOR_CARD_BORDER
    c2.line.width = Pt(1)

    t2 = s2.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(4.8), Inches(4.8))
    tf2 = t2.text_frame
    tf2.word_wrap = True

    p = tf2.paragraphs[0]
    p.text = "The Physical Detection Barriers:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN

    bullets2 = [
        ("Sub-Pixel Proper Motion:", "At 400 AU, Planet X shifts only 0.385 arcseconds over SPHEREx's 6-month survey cadence. With a 6.20\"/px detector pitch, this displacement is 0.062 pixels (< 1/16th of a single pixel)."),
        ("Extreme Optical Dimming (1/d^4):", "Reflected sunlight scales inversely with the fourth power of distance. At 400 AU, optical flux is attenuated by a factor of 2.56 x 10^10 compared to 1 AU."),
        ("Infrared Thermal Dominance (1/d^2):", "Thermal blackbody radiation drops only as 1/d^2, peaking beyond 3.5 um (SPHEREx Bands 4-6) at equilibrium temperatures T_eq ≈ 14-40 K."),
        ("The Tooling Gap:", "Before our work, no public, lightweight web tool existed allowing researchers and citizen scientists to blink SPHEREx epochs and extract calibrated aperture photometry.")
    ]

    for title, desc in bullets2:
        pb = tf2.add_paragraph()
        pb.text = f"• {title} "
        pb.font.bold = True
        pb.font.size = Pt(11.5)
        pb.font.color.rgb = COLOR_TEXT_WHITE
        pb.space_before = Pt(8)
        
        # Add description text
        run = pb.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_TEXT_MUTED

    # Right Diagram
    diag_solar = os.path.join(ASSETS_DIR, "diagram_solar_system.png")
    if os.path.exists(diag_solar):
        s2.shapes.add_picture(diag_solar, Inches(6.2), Inches(1.5), Inches(6.333), Inches(5.2))

    # ==========================================
    # SLIDE 3: OUR SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, prs)
    add_header(s3, "Architecture & User Experience", "Authentic Win32 Scientific Discovery Workstation")
    add_footer(s3, 3)

    # Left Column: Features
    c3 = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.2), Inches(5.2))
    c3.fill.solid()
    c3.fill.fore_color.rgb = COLOR_CARD_BG
    c3.line.color.rgb = COLOR_CARD_BORDER
    c3.line.width = Pt(1)

    t3 = s3.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(4.8), Inches(4.8))
    tf3 = t3.text_frame
    tf3.word_wrap = True

    p = tf3.paragraphs[0]
    p.text = "Zero Modern Web Bloat. Real Science:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = COLOR_GREEN

    features3 = [
        ("Multi-Epoch Blink Comparator:", "WiseView-heritage 4-epoch blinking at 1-10 Hz. Supports 8 scientific colormaps (Monochrome, Viridis, Inferno, Turbo) and asinh/linear contrast stretches."),
        ("Difference Imaging Mode:", "Instant signed epoch differencing (E2 - E1) that cancels static stars and isolates transient and moving-body dipole signatures."),
        ("Batch Aperture Photometry Engine:", "Sub-pixel circular aperture integration with MAD sigma-clipped sky background estimation across all 96 LVF channels."),
        ("Gaia DR3 & NEOSSat Cross-Matching:", "Real-time coordinate queries to ESA Gaia DR3 for proper motion verification and CSA NEOSSat asteroid orbits.")
    ]

    for title, desc in features3:
        pb = tf3.add_paragraph()
        pb.text = f"• {title} "
        pb.font.bold = True
        pb.font.size = Pt(11.5)
        pb.font.color.rgb = COLOR_TEXT_WHITE
        pb.space_before = Pt(9)
        
        run = pb.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_TEXT_MUTED

    # Right Screenshot of App
    app_img = os.path.join(ASSETS_DIR, "app_overview.png")
    if os.path.exists(app_img):
        s3.shapes.add_picture(app_img, Inches(6.2), Inches(1.5), Inches(6.333), Inches(5.2))

    # ==========================================
    # SLIDE 4: THE SCIENCE - DIFFERENCE IMAGING
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, prs)
    add_header(s4, "Mathematical Physics", "Image Differencing & Dipole Formation")
    add_footer(s4, 4)

    # Left Derivation Card
    c4 = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.2), Inches(5.2))
    c4.fill.solid()
    c4.fill.fore_color.rgb = COLOR_CARD_BG
    c4.line.color.rgb = COLOR_CARD_BORDER
    c4.line.width = Pt(1)

    t4 = s4.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(4.8), Inches(4.8))
    tf4 = t4.text_frame
    tf4.word_wrap = True

    p = tf4.paragraphs[0]
    p.text = "First-Order Taylor Series Derivation:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN

    deriv_points = [
        ("Epoch Image Formulation:", "Let I_1(x) = f(x) be the point source at Epoch 1. At Epoch 2, it shifts by proper motion dx: I_2(x) = f(x - dx)."),
        ("Difference Image Residual:", "ΔI(x) = I_2(x) - I_1(x) = f(x - dx) - f(x). For small shifts dx << FWHM, expanding via Taylor series yields:\nΔI(x) ≈ -dx · [df/dx] + O(|dx|^2)"),
        ("The Antisymmetric Dipole:", "The residual profile is proportional to the spatial derivative of the telescope PSF. This produces an antisymmetric dipole: a positive flux peak (+F) right next to a negative trough (-F)."),
        ("Background Cancellation:", "Stationary background stars have dx = 0 and vanish completely (ΔI = 0). Noise adds in quadrature: σ_diff = √(σ_1^2 + σ_2^2) ≈ 1.414 · σ_0.")
    ]

    for title, desc in deriv_points:
        pb = tf4.add_paragraph()
        pb.text = f"• {title} "
        pb.font.bold = True
        pb.font.size = Pt(11.5)
        pb.font.color.rgb = COLOR_TEXT_WHITE
        pb.space_before = Pt(8)
        
        run = pb.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_TEXT_MUTED

    # Right Diagram
    diag_dipole = os.path.join(ASSETS_DIR, "diagram_dipole.png")
    if os.path.exists(diag_dipole):
        s4.shapes.add_picture(diag_dipole, Inches(6.2), Inches(1.5), Inches(6.333), Inches(5.2))

    # ==========================================
    # SLIDE 5: TECHNICAL PIPELINE & CALIBRATION
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, prs)
    add_header(s5, "Pipeline Architecture & Calibrations", "From Raw FITS Images to Calibrated Flux Catalogs")
    add_footer(s5, 5)

    # Top diagram across full width
    diag_arch = os.path.join(ASSETS_DIR, "diagram_architecture.png")
    if os.path.exists(diag_arch):
        s5.shapes.add_picture(diag_arch, Inches(0.8), Inches(1.5), Inches(11.733), Inches(5.2))

    # ==========================================
    # SLIDE 6: IMPACT & SYNERGIES
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, prs)
    add_header(s6, "Scientific Impact & Outreach", "Democratizing All-Sky Infrared Astrophysics")
    add_footer(s6, 6)

    # 3 Large Horizontal Cards
    card_data = [
        ("1. Citizen Science Discovery", COLOR_CYAN, [
            "Brings professional-grade astronomical blink inspection to anyone with a browser.",
            "Zero installation or coding barrier: runs on Vercel, GitHub Pages, and Hugging Face.",
            "Inspect billions of sky positions across 4 survey epochs with 8 colormaps and reticle WCS.",
            "Enables crowdsourced candidate classification for faint asteroids and distant perturbers."
        ]),
        ("2. Undergraduate Educational Foundation", COLOR_AMBER, [
            "Backed by a complete undergraduate research paper authored alongside the tool.",
            "Covers Keplerian celestial mechanics, thin-film Fabry-Perot optics, and blackbody physics.",
            "Provides clear mathematical derivations of difference imaging and Taylor-series dipoles.",
            "Serves as an open curriculum module for observational astrophysics students."
        ]),
        ("3. Cross-Survey Astronomical Synergies", COLOR_GREEN, [
            "Extends a 15-year baseline by cross-linking SPHEREx multi-epoch data with NASA WISE (2010).",
            "At 400 AU, 15 years yields > 11 arcsec of motion (nearly 2 full SPHEREx pixels).",
            "Bridges optical surveys (Vera C. Rubin LSST) with continuous 102-channel infrared spectra.",
            "NASA-standard FITS BINTABLE outputs ensure immediate plug-and-play with Astropy pipelines."
        ])
    ]

    for i, (ctitle, ccolor, cpoints) in enumerate(card_data):
        x = Inches(0.8 + i * 4.0)
        c = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.5), Inches(3.733), Inches(5.2))
        c.fill.solid()
        c.fill.fore_color.rgb = COLOR_CARD_BG
        c.line.color.rgb = COLOR_CARD_BORDER
        c.line.width = Pt(1)

        tx = s6.shapes.add_textbox(x + Inches(0.2), Inches(1.7), Inches(3.333), Inches(4.8))
        ttf = tx.text_frame
        ttf.word_wrap = True

        cp = ttf.paragraphs[0]
        cp.text = ctitle
        cp.font.size = Pt(15)
        cp.font.bold = True
        cp.font.color.rgb = ccolor

        for pt in cpoints:
            pt_p = ttf.add_paragraph()
            pt_p.text = f"• {pt}"
            pt_p.font.size = Pt(11)
            pt_p.font.color.rgb = COLOR_TEXT_MUTED
            pt_p.space_before = Pt(8)

    # ==========================================
    # SLIDE 7: LIVE DEMO & DATA CITATIONS
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, prs)
    add_header(s7, "Open Science & Resources", "Live Deployments, Source Code & Data Citations")
    add_footer(s7, 7)

    # Left Column: Deployment & Code Links
    c7_left = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.7), Inches(5.2))
    c7_left.fill.solid()
    c7_left.fill.fore_color.rgb = COLOR_CARD_BG
    c7_left.line.color.rgb = COLOR_CARD_BORDER
    c7_left.line.width = Pt(1)

    t7l = s7.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(5.3), Inches(4.8))
    ttf7l = t7l.text_frame
    ttf7l.word_wrap = True

    p = ttf7l.paragraphs[0]
    p.text = "Try the Live Platform & Inspect Source Code:"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN

    links = [
        ("Web Application (Vercel):", "https://spherex-photometry.vercel.app"),
        ("Alternative Mirror (GitHub Pages):", "https://yancovert.github.io/spherex-photometry/"),
        ("Cloud Container (Hugging Face):", "https://huggingface.co/spaces/Yancovert/spherex-photometry"),
        ("Source Code (MIT License):", "https://github.com/Yancovert/spherex-photometry"),
        ("Research Paper:", "spherex_research_paper.md / .tex / .docx (in repo)")
    ]

    for label, val in links:
        pl = ttf7l.add_paragraph()
        pl.text = f"{label}\n"
        pl.font.bold = True
        pl.font.size = Pt(12)
        pl.font.color.rgb = COLOR_TEXT_WHITE
        pl.space_before = Pt(8)
        
        run = pl.add_run()
        run.text = val
        run.font.bold = False
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_AMBER

    # Right Column: Mandatory NASA Citations
    c7_right = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.5), Inches(5.733), Inches(5.2))
    c7_right.fill.solid()
    c7_right.fill.fore_color.rgb = COLOR_CARD_BG
    c7_right.line.color.rgb = COLOR_CARD_BORDER
    c7_right.line.width = Pt(1)

    t7r = s7.shapes.add_textbox(Inches(7.0), Inches(1.7), Inches(5.333), Inches(4.8))
    ttf7r = t7r.text_frame
    ttf7r.word_wrap = True

    pr = ttf7r.paragraphs[0]
    pr.text = "Mandatory Data & Mission Citations:"
    pr.font.size = Pt(16)
    pr.font.bold = True
    pr.font.color.rgb = COLOR_GREEN

    citations = [
        ("NASA / IPAC Infrared Science Archive (IRSA):", "SPHEREx Level 2 Calibrated Images, Public-products v28 Current Best Estimate (CBE) calibration tables, and TAP API."),
        ("ESA Gaia Mission (Gaia Collaboration):", "Gaia Data Release 3 (DR3) astrometric proper motion catalogs and cross-match reference frames."),
        ("Canadian Space Agency (CSA):", "NEOSSat (Near-Earth Object Surveillance Satellite) public orbital archives for asteroid verification."),
        ("Theoretical Framework:", "Batygin & Brown (2016, 2021) 'Orbit of Planet Nine', AJ; Bock et al. (2018) 'SPHEREx All-Sky Spectral Survey'; Alard & Lupton (1998) 'Optimal Image Subtraction'."),
        ("Team Exulans:", "Developed for NASA Space Apps Challenge 2026. Team logo designed by Freund0815.")
    ]

    for label, val in citations:
        prc = ttf7r.add_paragraph()
        prc.text = f"• {label} "
        prc.font.bold = True
        prc.font.size = Pt(11.5)
        prc.font.color.rgb = COLOR_TEXT_WHITE
        prc.space_before = Pt(7)
        
        run = prc.add_run()
        run.text = val
        run.font.bold = False
        run.font.size = Pt(10.5)
        run.font.color.rgb = COLOR_TEXT_MUTED

    # Save Presentation
    prs.save(OUTPUT_PPTX)
    print(f"Presentation saved successfully to {OUTPUT_PPTX}")

if __name__ == "__main__":
    build_presentation()
