# <img src="https://github.com/aidenybai/bippy/blob/main/.github/assets/bippy.png?raw=true" width="60" align="center" /> bippy

a hacky way to get fibers from react. used internally for [`react-scan`](https://github.com/aidenybai/react-scan).

bippy works by setting a "fake" version of the `__REACT_DEVTOOLS_GLOBAL_HOOK__` object. this gives us access to react internals without actually using react devtools.

> [!WARNING]
> this project uses react internals, which can change at any time. **this is not recommended for usage and may break production apps** - unless you acknowledge this risk and know exactly you're doing.

## example

this script logs every rendered fiber in the current [commit](https://react.dev/learn/render-and-commit) via `onCommitFiberRoot`.

inspect it live [here](https://bippy.million.dev/).

```jsx
import { instrument, traverseFiberRoot, getDisplayName } from 'bippy'; // must be imported BEFORE react

instrument({
  onCommitFiberRoot: traverseFiberRoot({
    onRender(fiber) {
      const displayName = getDisplayName(fiber.type);
      if (!displayName) return;
      console.log(`${displayName} rendered`, fiber);
    },
  }),
});
```

## misc

the original bippy character is owned and created by [@dairyfreerice](https://www.instagram.com/dairyfreerice). this project is not related to the bippy brand, i just think the character is cute
