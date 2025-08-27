# Notification Setup Guide

## Current Notification Methods

### 1. **Default GitHub Notifications**
- **Email notifications** (if enabled in GitHub settings)
- **GitHub UI notifications** (bell icon)
- **Repository notifications** (if you're watching the repo)

### 2. **Slack Notifications** (New - Recommended)

We've added a single, efficient Slack notification workflow that sends messages when workflows complete.

## Setting Up Slack Notifications

### Step 1: Create a Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "GitHub Actions Notifications"
4. Select your workspace

### Step 2: Configure Incoming Webhooks
1. Go to "Incoming Webhooks" in the left sidebar
2. Click "Activate Incoming Webhooks"
3. Click "Add New Webhook to Workspace"
4. Select the channel (e.g., `#ci-cd`)
5. Copy the webhook URL

### Step 3: Add GitHub Secret
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste the webhook URL from step 2

### Step 4: Customize Channel (Optional)
Edit `.github/workflows/slack-notifications.yml` and change `#ci-cd` to your desired Slack channel.

## What You'll Receive

### Success Notifications
```
✅ CI Tests - success

Repo: midnightntwrk/example-counter
Branch: main
By: username

Details: [Link to workflow run]
```

### Failure Notifications
```
🚨 Security & Audit - failure

Repo: midnightntwrk/example-counter
Branch: feature/new-feature
By: username

Details: [Link to workflow run]
```

## Alternative Notification Methods

### Email Notifications
GitHub provides email notifications by default:
1. Go to repository Settings → Notifications
2. Configure email preferences

### GitHub UI Notifications
- **Bell Icon**: Shows workflow status in GitHub UI
- **Repository Tab**: Shows recent workflow runs
- **Pull Request Checks**: Shows status directly on PRs

## Troubleshooting

### Slack Notifications Not Working?
1. **No webhook configured**: If `SLACK_WEBHOOK_URL` is not set, notifications will be skipped gracefully
2. **Verify webhook URL**: Check that `SLACK_WEBHOOK_URL` secret is set correctly
3. **Check Slack app permissions**: Ensure the Slack app has proper permissions
4. **Verify channel name**: Make sure the channel exists and the app is added to it
5. **Check workflow trigger conditions**: Ensure the workflow is being triggered

### What Happens Without Slack Configuration?
- ✅ **No breaking**: Main workflows (CI Tests, Security Audit) continue to work normally
- ✅ **Graceful handling**: Notification workflow skips Slack step and shows info message
- ✅ **No errors**: You'll see a green checkmark in Actions tab
- ℹ️ **Info message**: Workflow logs will show "Slack notifications skipped - webhook not configured"

### Test Notifications
To test if notifications are working:
1. Make a small change to trigger a workflow
2. Check your Slack channel for the notification
3. Verify the workflow status matches the notification

## Workflow Status Summary

| Workflow | Purpose | Blocking | Notifications |
|----------|---------|----------|---------------|
| CI Tests | Contract unit tests, CLI tests, Docker validation | ✅ Yes | ✅ Slack + GitHub |
| Security & Audit | Dependency scanning, code analysis | ❌ No (informational) | ✅ Slack + GitHub |
| Checkmarx | SAST security scanning | ❌ No (graceful failure) | ✅ Slack + GitHub |
| Slack Notifications | Send notifications to Slack | ❌ No | N/A |

## Quick Commands

### Check Current Notifications
```bash
# View recent workflow runs
gh run list

# View specific workflow run
gh run view <run-id>
```

### Test Notifications Locally
```bash
# Trigger a workflow manually
gh workflow run ci-tests.yml
```
