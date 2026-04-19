# -*- coding: utf-8 -*-
"""Reorder Settings.tsx tab panels: profile, team, integrations, agendamento, subscription."""
from pathlib import Path

winai_dir = Path(__file__).resolve().parents[1]
settings = winai_dir / "components" / "Settings.tsx"
team_snippet = winai_dir / "components" / "_settings_team_tab.txt"

s = settings.read_text(encoding="utf-8")
team = team_snippet.read_text(encoding="utf-8")

sub = "            {activeTab === 'subscription' && ("
ag = "            {activeTab === 'agendamento' && ("
inte = "            {activeTab === 'integrations' && ("
close_triple = "          </div>\n        </div>\n      </div>\n\n      {/* QR Code Modal */}"

i0 = s.find(sub)
i1 = s.find(ag)
i2 = s.find(inte)
i3 = s.find(close_triple)

if min(i0, i1, i2, i3) < 0:
    raise SystemExit(f"anchors: sub={i0} ag={i1} int={i2} close={i3}")

head = s[:i0]
block_sub = s[i0:i1]
block_ag = s[i1:i2]
block_int = s[i2:i3]
tail = s[i3:]

new_s = head + team + block_int + block_ag + block_sub + tail
settings.write_text(new_s, encoding="utf-8")
print("OK: reordered tabs + inserted team block")
