import React, {useContext, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, Header, Label, ListBox, ListBoxItem, ListBoxSection, Popover, Select, SelectStateContext, SelectValue} from 'react-aria-components';
import {announce} from '@react-aria/live-announcer';

// English-only approximation of adobe/react-spectrum#10871 (useSelect): announce the option
// count when the popover opens, including when an option already has focus on Apple
// devices (VoiceOver doesn't read "1 of N" there). Uses the same countAnnouncement wording.
function isAppleDevice() {
  return /^Mac|^iPhone|^iPad/i.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);
}
function countItems(collection) {
  let n = 0;
  for (let node of collection) {
    if (node.type === 'section') n += countItems(collection.getChildren ? collection.getChildren(node.key) : node.childNodes);
    else if (node.type === 'item') n++;
  }
  return n;
}
function PatchedAnnouncer({onAnnounce}) {
  let state = useContext(SelectStateContext);
  // Select also renders its children in a hidden collection-building tree,
  // outside the state provider. Only mount the effect for the live Select.
  return state ? <SelectAnnouncer state={state} onAnnounce={onAnnounce} /> : null;
}
function SelectAnnouncer({state, onAnnounce}) {
  let count = countItems(state.collection);
  let lastOpen = useRef(state.isOpen);
  let lastSize = useRef(count);
  useEffect(() => {
    let didOpen = state.isOpen !== lastOpen.current &&
      (state.selectionManager.focusedKey == null || isAppleDevice());
    if (state.isOpen && (didOpen || count !== lastSize.current)) {
      let msg = count === 1 ? '1 option available.' : `${count} options available.`;
      announce(msg);
      onAnnounce(msg);
    }
    lastOpen.current = state.isOpen;
    lastSize.current = count;
  });
  return null;
}

function Demo({patched}) {
  let [log, setLog] = useState([]);
  return (
    <section style={{flex: 1, padding: 16, border: '1px solid #ccc', borderRadius: 8}}>
      <h2>{patched ? 'Count-announcement demo (PR #10871)' : 'Baseline (react-aria-components 1.22.1)'}</h2>
      <Select defaultSelectedKey="cat">
        <Label style={{display: 'block'}}>Favorite Animal</Label>
        <Button><SelectValue /> <span aria-hidden="true">▼</span></Button>
        {patched && <PatchedAnnouncer onAnnounce={m => setLog(l => [...l, m])} />}
        <Popover style={{background: 'white', border: '1px solid #999', padding: 4}}>
          <ListBox>
            <ListBoxSection><Header>Mammals</Header>
              <ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem><ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
            </ListBoxSection>
            <ListBoxSection><Header>Birds</Header>
              <ListBoxItem id="parrot">Parrot</ListBoxItem><ListBoxItem id="penguin">Penguin</ListBoxItem>
            </ListBoxSection>
          </ListBox>
        </Popover>
      </Select>
      <p><strong>Demo helper announcements:</strong></p>
      <ul>{log.length ? log.map((m, i) => <li key={i}>{m}</li>) : <li>(none)</li>}</ul>
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <div style={{fontFamily: 'sans-serif', padding: 16}}>
    <h1>adobe/react-spectrum #10871: Select option count announcement</h1>
    <p>Focus a Select and open it with Space. The left side uses the unmodified published package. On Apple devices, the right side adds "5 options available." even when the selected option is focused.</p>
    <p>This is an English-only approximation of the PR's announcement effect, not a build of the upstream patch. The log records calls from the demo helper, not screen-reader speech. To assess the accessibility behavior, compare both sides with VoiceOver in macOS Safari; that manual check has not been performed here.</p>
    <div style={{display: 'flex', gap: 16}}><Demo patched={false} /><Demo patched /></div>
  </div>
);
