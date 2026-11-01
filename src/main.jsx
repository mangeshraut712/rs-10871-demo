import React, {useContext, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, Header, Label, ListBox, ListBoxItem, ListBoxSection, Popover, Select, SelectStateContext, SelectValue} from 'react-aria-components';
import {announce} from '@react-aria/live-announcer';

// Mirrors the change in adobe/react-spectrum#10871 (useSelect): announce the option
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
      <h2>{patched ? 'With fix (PR #10871)' : 'Current behavior'}</h2>
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
      <p><strong>Live announcements:</strong></p>
      <ul>{log.length ? log.map((m, i) => <li key={i}>{m}</li>) : <li>(none)</li>}</ul>
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <div style={{fontFamily: 'sans-serif', padding: 16}}>
    <h1>adobe/react-spectrum #10871: Select option count announcement</h1>
    <p>Focus a Select and open it (Space). With VoiceOver on macOS Safari, the left side gives no count; the right side announces "5 options available." even though the selected option is focused. Announcements are also logged below each Select.</p>
    <div style={{display: 'flex', gap: 16}}><Demo patched={false} /><Demo patched /></div>
  </div>
);
