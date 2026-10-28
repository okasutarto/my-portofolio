"""Flatten a wallpaper into a toon look: few flat colours, no fine texture, thick ink outlines."""
import sys
import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
K = int(sys.argv[3]) if len(sys.argv) > 3 else 9
dark = "-dark" in src

img = cv2.imread(src)
H, W = img.shape[:2]

# Work small so fine strokes, halftone and hatching melt away
small = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
for _ in range(2):
    small = cv2.pyrMeanShiftFiltering(small, sp=6, sr=18)
small = cv2.medianBlur(small, 5)

# Quantise to a small poster palette (in Lab so the clusters are perceptual)
lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
_, labels, centers = cv2.kmeans(lab, K, None, crit, 4, cv2.KMEANS_PP_CENTERS)
labels = labels.reshape(small.shape[:2]).astype(np.uint8)

# Mode filter: tiny islands take their neighbours' colour, giving big chunky shapes
for _ in range(2):
    votes = np.stack([cv2.blur((labels == k).astype(np.float32), (5, 5)) for k in range(K)])
    labels = votes.argmax(0).astype(np.uint8)
votes = np.stack([cv2.blur((labels == k).astype(np.float32), (9, 9)) for k in range(K)])
labels = votes.argmax(0).astype(np.uint8)

# Back to full size with smooth (not pixelated) region borders
votes = np.stack([cv2.GaussianBlur(cv2.resize((labels == k).astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR), (0, 0), 2) for k in range(K)])
labels = votes.argmax(0).astype(np.uint8)

# Punch the palette up a little: more saturation, poster-like
pal = cv2.cvtColor(centers.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2BGR)
hsv = cv2.cvtColor(pal, cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 1.15, 0, 255)
pal = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)[0]
out = pal[labels]

# Ink: every border between colour regions becomes a thick dark navy line
edges = np.zeros((H, W), np.uint8)
edges[:, 1:] |= (labels[:, 1:] != labels[:, :-1]).astype(np.uint8)
edges[1:, :] |= (labels[1:, :] != labels[:-1, :]).astype(np.uint8)
edges = cv2.dilate(edges * 255, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
edges = cv2.GaussianBlur(edges, (0, 0), 0.8).astype(np.float32)[..., None] / 255
ink = np.array([60, 22, 18] if not dark else [40, 12, 10], np.float32)  # BGR navy
out = (out.astype(np.float32) * (1 - edges) + ink * edges).astype(np.uint8)

cv2.imwrite(dst, out)
