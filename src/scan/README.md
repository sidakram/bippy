# react scan v1 architecture

- `bippy` / `@react-scan/web-vitals`
  - `@react-scan/web-instrumentation`: web instrumentation, export API for renders, types of renders, FPS, CWV
    - `react-scan`:
      - web highlighting overlay
      - web toolbar
    - `@react-scan/playwright`:
      - playwright plugin (... for each testing lib)
    - `@react-scan/sdk`:
      - observability sdk
  - `@react-scan/native-instrumentation`: native instrumentation, export API for renders, types of renders, FPS, CWV
    - `@react-scan/native`:
      - native highlighting overlay
      - native toolbar

## todo

- [ ] backwards compatibility (for worker, offscreen canvas)
- [ ] feature compat with existing version (core, instrumentation, highlighting)
- [ ] fills are not correct, validate we're not oversending stuff
- [ ] blocklist on websites
- [ ] refactor main website
- [ ] some sort of easy way to integrate with devtools
- [ ] playwright version
