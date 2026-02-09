# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "IconMaker" [level=1] [ref=e5]
    - button "Switch to dark mode" [ref=e7] [cursor=pointer]:
      - img
  - generic [ref=e8]:
    - complementary [ref=e9]:
      - button "Drop an image here or click to upload PNG, JPG, or WebP (max 20 MB)" [ref=e10] [cursor=pointer]:
        - img [ref=e11]
        - generic [ref=e14]:
          - paragraph [ref=e15]: Drop an image here or click to upload
          - paragraph [ref=e16]: PNG, JPG, or WebP (max 20 MB)
      - generic [ref=e17]:
        - paragraph [ref=e18]: Tips for best results
        - paragraph [ref=e19]: These tips improve detection + transparency quality.
        - list [ref=e20]:
          - listitem [ref=e21]: Use images with a solid white or light background
          - listitem [ref=e22]: Avoid images with text overlapping icons
          - listitem [ref=e23]: High-resolution source images work well
          - listitem [ref=e24]: If too many icons detected, increase Min Area
          - listitem [ref=e25]: If icons are missed, decrease Sensitivity
    - main [ref=e26]:
      - generic [ref=e27]:
        - img [ref=e28]
        - paragraph [ref=e31]: Upload an icon splash image
        - paragraph [ref=e32]: Drag and drop or use the upload area in the sidebar
```