
(function(){
	const LS_KEY = 'sterlo_attendance_v1';

	const el = id => document.getElementById(id);
	const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,6);
	const formatDate = d => d.toISOString().slice(0,10);
	const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

	function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {students:[], attendance:{}} }catch(e){ return {students:[], attendance:{}} } }
	function save(v){ localStorage.setItem(LS_KEY, JSON.stringify(v)); }

	let state = load();

	const addForm = el('add-student-form');
	const nameInput = el('student-name');
	const attendanceArea = el('attendance-area');
	const viewSelect = el('view-select');
	const dateInput = el('date-input');
	const monthInput = el('month-input');
	const clearBtn = el('clear-data');
	const off1 = el('off1');
	const off2 = el('off2');

	function ensureDate(dateStr){ if(!state.attendance[dateStr]) state.attendance[dateStr] = {}; }

	function getWeekStart(dateLike){
		const d = new Date(dateLike);
		const day = d.getDay();
		const diff = (day + 6) % 7;
		d.setDate(d.getDate() - diff);
		d.setHours(0,0,0,0);
		return d;
	}

	function daysFrom(start, count){ const out=[]; const d=new Date(start); for(let i=0;i<count;i++){ out.push(new Date(d)); d.setDate(d.getDate()+1);} return out; }

	function buildDates(){
		if(viewSelect.value === 'week'){
			const start = dateInput.value ? getWeekStart(dateInput.value) : getWeekStart(new Date());
			return daysFrom(start, 7);
		}
		const monthVal = monthInput.value || (new Date()).toISOString().slice(0,7);
		const [y,m] = monthVal.split('-').map(Number);
		const start = new Date(y, m-1, 1);
		const days = new Date(y, m, 0).getDate();
		return daysFrom(start, days);
	}

	function filterWorkingDates(dates){
		const offA = Number(off1.value); const offB = Number(off2.value);
		return dates.filter(d=>{ const wd = d.getDay(); return wd !== offA && wd !== offB; });
	}

	function render(){
		const datesAll = buildDates();
		const workingDates = filterWorkingDates(datesAll);

		if(state.students.length === 0){
			attendanceArea.innerHTML = '<p class="small-muted">No students yet. Add a student above.</p>';
			return;
		}

		let html = '<div style="overflow:auto"><table><thead><tr>';
		html += '<th class="name-col">Student</th>';
		datesAll.forEach(d=>{
			const ds = formatDate(d);
			const wd = d.getDay();
			const isOff = (wd === Number(off1.value) || wd === Number(off2.value));
			html += `<th class="center" title="${ds}">${d.toISOString().slice(5,10)}<div style="font-size:11px;color:#6b7280">${weekdayNames[wd]}${isOff? ' (Off)':''}</div></th>`;
		});
		html += '<th class="center">% Present</th><th class="center">Actions</th></tr></thead><tbody>';

		state.students.forEach(s=>{
			html += `<tr data-id="${s.id}"><td>${escapeHtml(s.name)}</td>`;

			let presentCount = 0;
			workingDates.forEach(d=>{
				const ds = formatDate(d);
				ensureDate(ds);
				const val = !!state.attendance[ds][s.id];
				if(val) presentCount++;
			});

			datesAll.forEach(d=>{
				const ds = formatDate(d);
				ensureDate(ds);
				const wd = d.getDay();
				const isOff = (wd === Number(off1.value) || wd === Number(off2.value));
				const checked = !!state.attendance[ds][s.id] ? 'checked' : '';
				const disabled = isOff ? 'disabled' : '';
				html += `<td class="center"><input data-date="${ds}" data-id="${s.id}" type="checkbox" ${checked} ${disabled} /></td>`;
			});

			const totalWorking = workingDates.length || 1;
			const pct = Math.round((presentCount / totalWorking) * 100);
			html += `<td class="center percent">${pct}%</td>`;
			html += `<td class="center"><button class="btn-small delete-student">Delete</button></td>`;
			html += '</tr>';
		});

		html += '</tbody></table></div>';
		attendanceArea.innerHTML = html;

		attendanceArea.querySelectorAll('input[type="checkbox"]').forEach(cb=> cb.addEventListener('change', onToggle));
		attendanceArea.querySelectorAll('.delete-student').forEach(b=> b.addEventListener('click', onDelete));
	}

	function onToggle(e){
		const id = e.target.dataset.id; const date = e.target.dataset.date;
		ensureDate(date);
		if(e.target.checked) state.attendance[date][id] = true; else delete state.attendance[date][id];
		save(state); render();
	}

	function onDelete(e){
		const id = e.target.closest('tr').dataset.id;
		state.students = state.students.filter(s=> s.id !== id);
		Object.keys(state.attendance).forEach(d=>{ if(state.attendance[d] && state.attendance[d][id]) delete state.attendance[d][id]; });
		save(state); render();
	}

	addForm.addEventListener('submit', function(ev){ ev.preventDefault(); const n = nameInput.value.trim(); if(!n) return; state.students.push({id: uid(), name: n}); save(state); nameInput.value=''; render(); });

	[viewSelect, dateInput, monthInput, off1, off2].forEach(node=> node.addEventListener('change', ()=> render()));
	clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all data?')){ state={students:[],attendance:{}}; save(state); render(); } });

	function escapeHtml(s){ return (s+'').replace(/[&<>\"]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

	(function(){ const t=new Date(); dateInput.value = formatDate(getWeekStart(t)); monthInput.value = t.toISOString().slice(0,7); render(); })();

})();

