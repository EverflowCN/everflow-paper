# FocusPomo 5.2.2 recovered configuration applied to `/me/focus`

## Exact visual configuration recovered from Assets.car

These are direct named-color renditions from the decrypted IPA, not guessed colors.

| Asset color | Light | Dark | Web surface |
|---|---|---|---|
| Background | `#F0E9E1` | `#1C1E28` | settings / picker / app background |
| DataCenterBackground | `#EDE9E6` | `#1C1E28` | statistics background |
| DataCenterSectionBackground | `#FFFFFF` | `#2A2C35` | statistics cards |
| ConfigTitle | `#4D4D4D` | `#FFFFFF` | settings primary text |
| ConfigMessage | `rgba(77,77,77,.70)` | `rgba(255,255,255,.70)` | settings secondary text |
| Text | `#615549` | `#FFFFFF` | general primary text |
| TagTitle | `#4D4844` | `#FFFFFF` | tag names |
| Highlight | `#D96D57` | `#D96D57` | selected / action accent |
| FocusButtonBackground | `#615549` | `#393D44` | Start Focus button |
| HomeFocusControlButtonBackground | `rgba(97,85,73,.10)` | `rgba(255,255,255,.10)` | pause/stop control wells |
| SelectIntervalButtonBackground | `#D96D57` | `#FFFFFF` | interval picker action |
| SelectIntervalButtonText | `#FFFFFF` | `#1C1E28` | interval picker action text |
| PopupBackground | `#F0E4D8` | `#242833` | popup/menu |
| SecondBackground | `#E7DFD5` | recovered dark rendition | secondary grouped surfaces |
| TagCellBackground | `rgba(255,255,255,.60)` | `rgba(255,255,255,.10)` | non-selected tags |
| TimelineBorder | `rgba(97,85,73,.20)` | `rgba(255,255,255,.10)` | timeline separators |
| DateSelectorBackground | `rgba(17,0,0,.06)` | `rgba(255,255,255,.08)` | date selector |
| FinishPageButtonBgColor | `#4D4945` | `rgba(255,255,255,.15)` | finish-page buttons |
| AddTagButtonBackground | `#D96D57` | `#D96D57` | add-tag action |
| BackgroundForWelcome | `#E5D4C3` | same semantic surface | welcome surface |
| PickerSelectRowBackground | `rgba(0,0,0,.04)` | `rgba(255,255,255,.04)` | selected picker row |

## Behavior mapped from recovered evidence

- `PTFocusState`: `idle / focus / focusPaused / takeARest / rest`.
- `FocusStopOutcome`: `finishEarly / abandon`.
- `PTTaskState`: `undefined / finished / stop / paused`.
- Original pause/continue controls are count-up-only; countdown natural completion and stop remain separate flows.
- Finished sessions receive normal/custom selected fruit; abandoned sessions use the original dedicated yellow failed-tomato family. The Data Center uses its own dedicated failed-tomato rendition.
- Fruit dimensions continue to follow actual focused duration in the web reconstruction.

## Values deliberately not presented as original defaults

The exact original numeric Focus Group configuration and its boundary constants were not recovered. Therefore the web page keeps the user's existing editable short-break, long-break and cycle-count settings instead of falsely labelling reconstructed values as FocusPomo defaults.

The custom pear/random fruit system is an extension requested by the user. It coexists with the recovered original tomato assets; it is not represented as an original FocusPomo 5.2.2 feature.
