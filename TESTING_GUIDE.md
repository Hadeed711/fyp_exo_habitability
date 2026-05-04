# 🚀 Quick Start Guide - Testing Your Application

## Prerequisites
- ✅ Backend server running on `http://localhost:8000`
- ✅ Frontend dev server running on `http://localhost:3000`
- ✅ Database populated with 9,614 exoplanets

---

## 🏃 Quick Start

### 1. Start Backend (Terminal 1)
```powershell
cd F:\FYP
.\.venv\Scripts\Activate.ps1
python backend/manage.py runserver
```

### 2. Start Frontend (Terminal 2)
```powershell
cd F:\FYP\frontend
npm run dev
```

### 3. Open Browser
Navigate to: **http://localhost:3000**

---

## 🧪 Feature Testing Checklist

### ✅ Home Page
- [ ] Page loads without errors
- [ ] Hero section visible
- [ ] "Explore Planets" button works
- [ ] Navigation to other pages works
- [ ] Footer links functional

### ✅ Explore Page (/explore)
**Search Functionality:**
- [ ] Type "Kepler" in search bar
- [ ] Suggestions dropdown appears
- [ ] Click a suggestion → redirects to planet detail
- [ ] Search results update in planet grid

**Filters Panel:**
- [ ] Select different missions (K2, Kepler, TESS)
- [ ] Planets filter by mission
- [ ] Adjust radius slider
- [ ] Adjust temperature slider
- [ ] Habitability class filter works
- [ ] Reset filters button works

**Planet Grid:**
- [ ] Shows 12 planets initially
- [ ] "Load More" button appears
- [ ] Clicking "Load More" loads next 12
- [ ] Planet cards show correct data
- [ ] Mission badges colored correctly
- [ ] Habitability scores display
- [ ] "View Details" button works

**Prediction Panel:**
- [ ] Panel expands/collapses
- [ ] All 7 sliders work smoothly
- [ ] "Earth-like" preset loads values
- [ ] "Mars-like" preset loads values
- [ ] "Venus-like" preset loads values
- [ ] "Predict" button shows loading state
- [ ] Prediction result appears
- [ ] Habitability score displays (0-100%)
- [ ] Classification shown (Green/Yellow/Red)
- [ ] Confidence breakdown visible
- [ ] "Reset" button works

### ✅ Upload Page (/upload)
**Template Download:**
- [ ] "Download Sample Template" button works
- [ ] CSV file downloads correctly
- [ ] Template has correct headers

**File Upload:**
- [ ] Drag-and-drop works
- [ ] Browse files button works
- [ ] File name and size display
- [ ] CSV validation (rejects non-CSV)
- [ ] Size validation (rejects > 5MB)
- [ ] Clear file (X button) works

**Processing:**
- [ ] "Upload and Process" button works
- [ ] Loading state shows during processing
- [ ] Progress indicator visible
- [ ] No errors in console

**Results:**
- [ ] Results summary displays
- [ ] Total planets count correct
- [ ] Habitable count shown
- [ ] Average score calculated
- [ ] "Download Results (CSV)" works
- [ ] Downloaded CSV has predictions
- [ ] "Upload Another File" clears results

### ✅ Compare Page (/compare)
- [ ] Page loads
- [ ] Coming soon message (or implemented UI)

### ✅ About Page (/about)
- [ ] Page loads
- [ ] Coming soon placeholder visible

### ✅ Navigation & UX
**Navbar:**
- [ ] All navigation links work
- [ ] Active page highlighted
- [ ] Mobile menu works (if responsive)

**Footer:**
- [ ] All footer links work
- [ ] Copyright year correct

**Scroll Behavior:**
- [ ] Navigating to any page scrolls to top
- [ ] Refreshing any page scrolls to top
- [ ] Smooth scrolling experience

---

## 🔍 API Testing (Optional - Using Browser DevTools)

### Check Network Tab (F12 → Network)

**When on Explore page:**
- [ ] See `GET /api/planets/` requests
- [ ] Status code: 200 OK
- [ ] Response has `results` array
- [ ] Response has `count` and `next` fields

**When searching:**
- [ ] See `GET /api/planets/?q=kepler` requests
- [ ] Status code: 200 OK
- [ ] Results filtered by query

**When filtering:**
- [ ] See `GET /api/planets/?mission=kepler&min_radius=1.0` etc.
- [ ] Status code: 200 OK
- [ ] Results match filters

**When predicting (Prediction Panel):**
- [ ] See `POST /api/predict/` request
- [ ] Request body has planet parameters
- [ ] Status code: 200 OK
- [ ] Response has `habitability_score` and `classification`

**When uploading CSV:**
- [ ] See `POST /api/predict/batch/` request
- [ ] Request body has `planets` array
- [ ] Status code: 200 OK
- [ ] Response has `results` array with predictions

---

## ⚠️ Common Issues & Fixes

### Issue: "Failed to load planets"
**Fix:**
1. Check backend is running: `http://localhost:8000/api/planets/`
2. Check browser console for CORS errors
3. Verify vite proxy is configured in `vite.config.js`

### Issue: "Service unavailable" or "ML models not loaded"
**Fix:**
1. Check backend console for errors
2. Verify model files exist in `artifacts/` folder
3. Restart backend server

### Issue: Search/Filter not working
**Fix:**
1. Check browser console for JavaScript errors
2. Verify API responses in Network tab
3. Clear browser cache and reload

### Issue: CSV upload fails
**Fix:**
1. Verify CSV has correct headers
2. Check file size < 5MB
3. Ensure at least one data row exists
4. Verify CSV format matches template

### Issue: Predictions return errors
**Fix:**
1. Check all required parameters are provided
2. Verify parameter ranges (e.g., radius 0.5-2.0)
3. Check backend logs for detailed error

---

## 📊 Expected Behavior

### Search Results
- Should return planets matching the query
- Case-insensitive search
- Matches planet names
- Shows top 5 suggestions

### Filtering
- Multiple filters work together (AND logic)
- Results update in real-time
- "Load More" resets when filters change
- Count updates correctly

### Predictions
- Should return within 1-2 seconds
- Score between 0-1 (displayed as percentage)
- Classification matches score:
  - ≥0.7 = POTENTIALLY_HABITABLE (Green)
  - 0.4-0.7 = HABITABILITY_ZONE (Yellow)
  - <0.4 = NON_HABITABLE (Red)

### Batch Upload
- Processing time increases with planet count
- Max 100 planets per batch
- All predictions succeed (or show specific errors)
- Results downloadable as CSV

---

## ✅ Success Criteria

**Consider the app working correctly if:**

1. **Home page** loads and navigation works
2. **Explore page** shows real planet data from database
3. **Search** returns relevant results
4. **Filters** properly filter planets
5. **Prediction panel** makes real ML predictions
6. **Upload page** processes CSV and returns predictions
7. **All navigation** works without errors
8. **Scroll to top** works on all page changes
9. **No console errors** (except acceptable warnings)
10. **Backend API** responds to all requests

---

## 🎯 Quick Tests (5 Minutes)

**Rapid validation of core features:**

1. **Search**: Type "Kepler" → See suggestions ✅
2. **Filter**: Select "K2" mission → See K2 planets ✅
3. **Predict**: Adjust sliders → Click Predict → See score ✅
4. **Upload**: Download template → Upload it → See results ✅
5. **Navigation**: Click all navbar links → No errors ✅

**If all 5 pass → App is working! 🎉**

---

## 📝 Testing Notes

**Browser Recommendations:**
- Chrome (best debugging tools)
- Firefox (good privacy features)
- Edge (good compatibility)

**Console Tab (F12):**
- Errors in **red** = critical issues
- Warnings in **yellow** = okay to ignore (usually)
- Blue logs = information messages

**Network Tab:**
- Failed requests = red status codes (400, 500)
- Successful requests = green status codes (200, 201)
- Pending requests = yellow

---

## 🆘 Getting Help

**If tests fail:**

1. **Check Console**: Press F12 → Console tab
2. **Check Network**: F12 → Network tab → Look for failed requests
3. **Check Backend**: Look at terminal running Django server
4. **Restart Servers**: Stop both frontend + backend, restart
5. **Clear Cache**: Ctrl+F5 (hard refresh)

**Still stuck?**
- Read the error message carefully
- Check [PHASE_4_COMPLETION_SUMMARY.md](./PHASE_4_COMPLETION_SUMMARY.md)
- Verify backend database has data
- Check all dependencies installed

---

## 🎊 You're Ready!

Start both servers and begin testing. Good luck! 🚀
