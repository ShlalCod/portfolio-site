# Media Buyer Portfolio - Live KPI Dashboard + Admin Panel

A production-ready, single-page portfolio website for a Media Buyer / Digital Marketer featuring an interactive Live KPI Dashboard with client-side campaign audit engine and a full-featured Admin Panel for complete site control.

## 🚀 Quick Start

**No build step required!** Simply open `index.html` in your browser:

```bash
# Option 1: Direct file open
open index.html

# Option 2: Use a local server (recommended for full functionality)
python -m http.server 8000
# Then visit http://localhost:8000

# Option 3: Using Node.js
npx serve .
```

**For Admin Panel:**
```bash
# Open admin.html for the admin interface
open admin.html
```

## 📁 Project Structure

```
portfolio-site/
├── index.html              # Main public site
├── admin.html              # Admin panel interface
├── css/
│   ├── style.css           # Public site styles
│   └── admin.css           # Admin panel styles
├── js/
│   ├── script.js           # Public site + audit engine
│   └── admin.js            # Admin panel logic
├── netlify/
│   └── functions/          # Serverless functions
│       ├── auth-validate.js
│       ├── content.js
│       └── assets-upload.js
├── data/
│   ├── site-content.json   # Site content & sections
│   ├── audit-config.json   # Audit rules & thresholds
│   ├── design-tokens.json  # Design system
│   └── samples/
│       ├── sample_campaign.csv
│       └── sample_campaign.json
├── assets/                 # Images, icons, SVGs
├── netlify.toml            # Netlify configuration
├── design-tokens.json      # Design system documentation
└── README.md               # This file
```

---

## 🎯 Features

### Public Site

1. **Hero** - Professional introduction with key stats
2. **Live KPI Dashboard** - Interactive campaign analysis
3. **About** - Profile and certifications
4. **Skills** - Grouped skill cards
5. **Projects** - 5 case studies with modals
6. **Experience** - Timeline layout
7. **Services** - Service offerings
8. **Career Objective** - Mission statement
9. **Contact** - Form and social links
10. **Footer** - Navigation and copyright

### Admin Panel Features

1. **Dashboard** - Overview with stats and quick actions
2. **Content Management** - Visual + JSON editor
3. **Sections Manager** - Reorder, enable/disable sections
4. **Projects CRUD** - Add/edit/delete project cards
5. **Design Tokens** - Live color/typography editor
6. **Components** - Configure individual UI elements
7. **WhatsApp Button** - Floating contact button control
8. **Audit Thresholds** - Configure audit sensitivity
9. **Rules Editor** - No-code audit rule builder
10. **Formulas** - Define custom metrics
11. **Media Library** - Asset management
12. **Import/Export** - Backup & restore
13. **Site Settings** - Metadata and configuration
14. **Version History** - Change tracking with rollback
15. **User Management** - Roles & permissions

---

## 📊 Dashboard Usage

### Loading Data

#### Option 1: Manual Entry
1. Click "Manual Entry" tab
2. Fill in campaign metrics
3. Click "Run Audit"

#### Option 2: CSV Upload
1. Click "Upload CSV" tab
2. Drag & drop or browse for CSV file
3. Preview the data
4. Click "Run Audit"

#### Option 3: JSON Paste
1. Click "Paste JSON" tab
2. Paste JSON array of campaign data
3. If fields don't match, use the mapping tool
4. Click "Run Audit"

#### Option 4: Sample Data
1. Click "Load Sample Data" button
2. 50-row demo dataset loads automatically

### CSV Format

```csv
date,campaign,adset,ad,spend,clicks,impressions,purchases,revenue,currency,utm_campaign,pixel_events,server_events,transaction_id,page_load_time,ad_copy
```

---

## 🔧 Audit Engine

### Default Thresholds

| Setting | Default | Description |
|---------|---------|-------------|
| ROAS Threshold | 1.5x | Flag campaigns below this |
| CPA Multiplier | 1.3x | Flag when CPA > target × multiplier |
| Min Conversions | 30 | Warn if total below this |
| Event Mismatch | 25% | Max pixel/server variance |
| Funnel Drop-off | 60% | Flag stages with this drop-off |
| Page Speed | 3s | Warn if load time exceeds |

### Built-in Audit Rules (15)

1. **Missing Conversions** - Revenue without purchases
2. **Event Mismatch** - Pixel vs server discrepancy
3. **Currency Inconsistency** - Mixed currencies detected
4. **Attribution Mismatch** - Varying attribution windows
5. **High CPA** - CPA exceeds target
6. **Low ROAS** - Below threshold
7. **Low Match Rate** - Customer match < 60%
8. **Duplicate Transactions** - Same transaction_id multiple times
9. **UTM Inconsistencies** - Missing UTM parameters
10. **Funnel Drop-off** - High checkout abandonment
11. **Insufficient Sample** - Low conversion volume
12. **Budget Imbalance** - Creative spend/conversion mismatch
13. **Pixel Not Firing** - Purchases without pixel events
14. **Page Speed** - Slow load times
15. **Ad Copy Flags** - Policy-relevant content patterns

### Adding a New Audit Rule

In `js/script.js`, add a function:

```javascript
function checkYourRule(data, config) {
    const problematicRows = data.filter(row => {
        // Your condition
        return row.someField > config.yourThreshold;
    });
    
    if (problematicRows.length === 0) return null;
    
    return {
        id: 'YOUR_RULE_ID',
        severity: 'P0',  // P0, P1, P2
        type: 'error',   // error, warning, info
        title: 'Issue Title',
        description: 'Description...',
        evidence: problematicRows.slice(0, 5),
        estimatedImpact: 'High/Medium/Low',
        confidence: 'High',
        recommendedFix: '1. Step one\n2. Step two'
    };
}
```

Then add to `runAudit()`:

```javascript
const findings = [
    // ...existing rules
    checkYourRule(data, config),
].filter(f => f !== null);
```

---

## 🎨 Admin Panel Usage

### Accessing Admin Panel

1. Navigate to `admin.html`
2. Sign in with Netlify Identity or use Dev Mode (development only)
3. Use the sidebar to navigate between sections

### Content Management

**Visual Editor:**
- Select content from tree
- Edit fields in form
- Changes apply to preview immediately

**JSON Editor:**
- Edit raw JSON
- Format/Validate buttons
- Apply Changes to save

### Design Tokens

1. Navigate to **Design Tokens**
2. Click color swatches to change colors
3. Modify typography settings
4. Changes preview in real-time
5. Click **Save** to persist

### WhatsApp Button

1. Navigate to **WhatsApp Button**
2. Toggle **Enable WhatsApp Button**
3. Enter phone number (E.164 format: +1234567890)
4. Configure position, size, and appearance
5. Enable pulse animation
6. Set visibility for mobile/desktop
7. Preview shows live result

### Publishing Changes

1. Make changes in admin panel
2. Click **Preview** to see live result
3. Click **Publish** when ready
4. Confirm in the modal
5. Changes are committed and site redeploys

---

## 🌐 Netlify Deployment

### Step 1: Create Netlify Account

1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub, GitLab, or email

### Step 2: Connect Repository

1. Push this project to GitHub
2. In Netlify, click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** (leave empty)
   - **Publish directory:** `/`
5. Click **Deploy site**

### Step 3: Enable Netlify Identity

1. Go to **Site settings** → **Identity**
2. Click **Enable Identity**
3. Under **Registration**, select **Invite only**
4. Under **Services** → **Git Gateway**, click **Enable Git Gateway**

### Step 4: Create Admin User

1. Go to **Identity** tab
2. Click **Invite users**
3. Enter your email
4. Accept the invitation via email
5. Set your password

### Step 5: Configure Environment Variables

Go to **Site settings** → **Build & deploy** → **Environment** and add:

```
GITHUB_TOKEN=ghp_xxxxx  # GitHub Personal Access Token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
NETLIFY_DEPLOY_HOOK=https://api.netlify.com/build_hooks/xxxxx
```

To create a GitHub token:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy the token

### Step 6: Create Deploy Hook (Optional)

1. Go to **Site settings** → **Build & deploy** → **Build hooks**
2. Click **Add build hook**
3. Name it "Admin Publish"
4. Copy the URL to `NETLIFY_DEPLOY_HOOK` env var

---

## 📡 API Endpoints

### Serverless Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.netlify/functions/auth-validate` | POST | Validate identity token |
| `/.netlify/functions/content` | GET | Get published content |
| `/.netlify/functions/content` | POST | Save draft |
| `/.netlify/functions/content` | PUT | Publish content |
| `/.netlify/functions/assets-upload` | POST | Upload asset |

### Request/Response Examples

**Get Content:**
```bash
GET /.netlify/functions/content?path=data/site-content.json

# Response
{
  "content": { ... },
  "sha": "abc123",
  "lastModified": "2024-01-01T00:00:00Z"
}
```

**Publish Content:**
```bash
PUT /.netlify/functions/content
Authorization: Bearer <token>
Content-Type: application/json

{
  "files": [
    {
      "path": "data/site-content.json",
      "content": { ... }
    }
  ],
  "message": "Updated hero section"
}

# Response
{
  "success": true,
  "message": "Content published",
  "results": [...]
}
```

---

## 🔒 Security

### Best Practices

1. **Never** put API keys in client-side code
2. Use Netlify Identity for authentication
3. All API calls go through serverless functions
4. Git tokens stored as environment variables
5. Enable Git Gateway for secure Git operations

### Content Security

- All dynamic content is escaped with `escapeHtml()`
- No `eval()` - JSON parsed with `JSON.parse()`
- File uploads validated server-side
- Allowed file types: JPEG, PNG, GIF, WebP, SVG

---

## 📦 Dependencies

### CDN Libraries (Public Site)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
```

### CDN Libraries (Admin Panel)

```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

### NPM Dependencies (Serverless)

```json
{
  "@octokit/rest": "^20.0.0"
}
```

---

## 🧪 Testing

### Unit Tests

Open browser console and run:

```javascript
runTests()
```

### Manual Testing Checklist

**Public Site:**
- [ ] Load sample data
- [ ] Upload CSV
- [ ] Paste JSON
- [ ] View all charts
- [ ] Export PDF/JSON
- [ ] Toggle dark/light mode
- [ ] Test on mobile

**Admin Panel:**
- [ ] Login via Netlify Identity
- [ ] Edit content
- [ ] Modify design tokens
- [ ] Configure WhatsApp button
- [ ] Create/edit audit rule
- [ ] Publish changes
- [ ] View history

---

## 🐛 Troubleshooting

### Admin Login Issues

1. Verify Netlify Identity is enabled
2. Check user is invited and confirmed
3. Clear browser cache
4. Try incognito mode

### Publish Fails

1. Check GitHub token has `repo` scope
2. Verify environment variables are set
3. Check Netlify function logs
4. Ensure Git Gateway is enabled

### Preview Not Updating

1. Hard refresh preview iframe
2. Check localStorage for saved content
3. Clear site data and reload

---

## 📄 License

This project is provided as-is for portfolio demonstration purposes.

---

Built with ❤️ for media buyers who care about data privacy and actionable insights.
