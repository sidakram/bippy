## todo

- split out the canvas modules so they make somewhat sense
- create a "RPC" layer for worker non worker communication
- clean up the worker / default check

## notes

- feature compat with existing version (core, instrumentation, highlighting)
- refactor main website
- playwright version

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
