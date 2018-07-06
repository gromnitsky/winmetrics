# winmetrics

Before 10 1703 Windows had a [dialog][] w/ which it was possible to
change such theme params like a font size of a window title. Now when
the dialog is gone you left either w/ a manual registry tweaking or
[various][] [tools][] than don't provide any visual guide to what
you're actually editing.

[dialog]: https://ultraimg.com/images/2018/07/06/O2dX.png
[various]: https://www.wintools.info/index.php/advanced-system-font-changer
[tools]: https://winaero.com/

Behold winmetrics:

![a screenshot](https://ultraimg.com/images/2018/07/06/O2kf.png)

Hovering over & clicking on a desired gui widget brings its relevant
options.

## Installation

Download a zip, unpack, double click on `runme.js`--a browser window
should pop up. After you're done w/ the util, click the Exit btn,
otherwise the server process will be still in memory after you close
the browser tab.

## Bugs

* The Export btn works in Chrome only.
* Edge may report -1 DPI.
* I'm not sure about the math in calculating the pixel size of the
  selected font. All the docs about Logfont point back to the 90s.
* If anything goes wrong, the util won't tell you a thing until you
  open the devtools console tab.

## License

MIT.
