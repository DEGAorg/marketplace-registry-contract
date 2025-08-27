# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Marketplace Registry project. These workflows ensure code quality, security, and reliability through automated testing and validation.

## Available Workflows

### 1. CI Tests (`ci-tests.yml`)

**Purpose**: Core continuous integration pipeline that runs on every push and pull request.

**Triggers**:
- Push to `feature/docker` branch
- Pull requests to `main` or `develop` branches

**Jobs**:
- **Contract Tests**: Compiles and tests the smart contract using Node.js 22.x
- **CompactC Compilation**: Installs CompactC compiler and runs compilation + tests (matching Dockerfile behavior)
- **Quality Checks**: Package consistency and workspace validation
- **Test Report**: Generates comprehensive test summaries

**Testing Strategy**: Uses native CI environment for fast execution while validating the same compilation process as the Dockerfile.

### 2. Security & Audit (`security-audit.yml`)

**Purpose**: Security-focused analysis and vulnerability scanning with informational notifications.

**Triggers**:
- Push to `feature/docker` branch
- Pull requests to `main` or `develop` branches

**Jobs**:
- **Dependency Scan**: npm audit for known vulnerabilities (INFORMATIONAL only)
- **Auto-fix Attempt**: Automatically attempts to fix vulnerabilities when possible
- **Code Analysis**: ESLint, TypeScript, and security pattern checks (includes CLI workspace)
- **Contract Security**: Smart contract security analysis
- **Security Summary**: Comprehensive security report with actionable recommendations

**Security Enforcement**:
- **INFORMATIONAL**: Provides warnings and recommendations without blocking
- **Auto-fixes** vulnerabilities when possible
- **Generates detailed reports** for manual resolution

### 3. Checkmarx One Scan (`checkmarx.yaml`)

**Purpose**: Static Application Security Testing (SAST) for code vulnerability detection.

**Triggers**:
- Pull requests to any branch
- Push to `main` branch

**Features**:
- **SAST scanning**: Static code analysis for security vulnerabilities
- **Server health monitoring**: Graceful handling of service downtime
- **Informational**: Provides security insights without blocking

### 4. Slack Notifications (`slack-notifications.yml`)

**Purpose**: Sends notifications to Slack when workflows complete.

**Triggers**:
- When any monitored workflow completes (success or failure)

**Features**:
- **Real-time notifications**: Immediate feedback on workflow status
- **Dynamic status handling**: Automatically shows success/failure with appropriate emojis
- **Comprehensive details**: Includes repo, branch, and actor information
- **Direct links**: Links to workflow run details
- **Single job design**: Efficient and maintainable

## Notification Setup

### Slack Notifications

To enable Slack notifications:

1. **Create a Slack App**:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it "GitHub Actions Notifications"
   - Select your workspace

2. **Configure Incoming Webhooks**:
   - Go to "Incoming Webhooks" in the left sidebar
   - Click "Activate Incoming Webhooks"
   - Click "Add New Webhook to Workspace"
   - Select the channel (e.g., `#ci-cd`)
   - Copy the webhook URL

3. **Add GitHub Secret**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Paste the webhook URL from step 2

4. **Customize Channel**:
   - Edit `.github/workflows/slack-notifications.yml`
   - Change `#ci-cd` to your desired Slack channel

### Email Notifications

GitHub provides email notifications by default:

1. **Repository Settings**:
   - Go to repository Settings → Notifications
   - Configure email preferences

2. **Personal Settings**:
   - Go to GitHub.com → Settings → Notifications
   - Configure workflow notification preferences

### GitHub UI Notifications

- **Bell Icon**: Shows workflow status in GitHub UI
- **Repository Tab**: Shows recent workflow runs
- **Pull Request Checks**: Shows status directly on PRs

## Workflow Dependencies

```
ci-tests.yml
├── contract-tests
├── compactc-compilation (depends on: contract-tests)
├── quality-checks (depends on: contract-tests)
└── test-report (depends on: all above)

security-audit.yml
├── dependency-scan
├── code-analysis
├── contract-security
└── security-summary (depends on: all above)

checkmarx.yaml
└── build (standalone)

slack-notifications.yml
└── notify (triggers on workflow completion)
```

## Manual Workflow Execution

### Trigger CI Tests Manually

You can manually trigger the CI tests workflow:

1. Go to the **Actions** tab in your GitHub repository
2. Select **CI Tests** workflow
3. Click **Run workflow**
4. Choose the branch
5. Click **Run workflow**

### CompactC Compilation Testing

The CompactC compilation job validates the same compilation process as the Dockerfile:

- Installs CompactC compiler in the CI environment
- Runs `npm run test:compile` (compilation + tests)
- Verifies compilation artifacts are created
- Matches the Dockerfile's default command behavior

## Environment Variables

### Required for CI Tests

```bash
NODE_ENV=test
CI=true
```

### CompactC Environment Variables

The CompactC compilation job automatically sets:

```bash
COMPACT_HOME=/usr/local/compactc
PATH=/usr/local/compactc:$PATH
```

### Required for Notifications

```bash
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Test Artifacts

All workflows generate and upload test artifacts:

- **Test Results**: JSON reports and logs
- **Coverage Reports**: Code coverage metrics
- **Build Artifacts**: Compiled contracts and CLI
- **Security Reports**: Vulnerability and audit reports
- **Performance Logs**: Benchmark results

Artifacts are retained for 7-90 days depending on the workflow.

## Troubleshooting

### Common Issues

1. **Contract Compilation Fails**
   - Verify `compactc` is properly installed in CI environment
   - Check contract source syntax
   - Ensure all dependencies are installed
   - Verify `COMPACT_HOME` environment variable is set

2. **CompactC Compilation Fails**
   - Check if CompactC download URL is accessible
   - Verify system dependencies (wget, unzip) are available
   - Check if compilation artifacts are created in `dist/` directory
   - Review the `npm run test:compile` command output

3. **Tests Fail in CI but Pass Locally**
   - Check Node.js version compatibility (22.x)
   - Verify environment variables are set correctly
   - Check for platform-specific issues
   - Ensure CompactC is available in local environment

4. **Security Workflow Issues**
   - Check for HIGH/CRITICAL vulnerabilities with `npm audit`
   - Run `npm audit fix` locally to attempt automatic fixes
   - Review the detailed vulnerability report in artifacts
   - Manually update packages if auto-fix fails

5. **Slack Notifications Not Working**
   - Verify `SLACK_WEBHOOK_URL` secret is set correctly
   - Check Slack app permissions
   - Verify channel name is correct
   - Check workflow trigger conditions

### Security Vulnerability Resolution

When the security workflow detects vulnerabilities:

1. **Review the Report**:
   ```bash
   # Check current vulnerabilities
   npm audit
   
   # Attempt automatic fixes
   npm audit fix
   
   # Check if vulnerabilities remain
   npm audit --audit-level=high
   ```

2. **Manual Resolution**:
   - Review the `vulnerability-details.md` report in workflow artifacts
   - Update specific packages manually if needed
   - Test locally after fixes
   - Re-run the security workflow

3. **Force Updates (Use with caution)**:
   ```bash
   npm audit fix --force
   npm update
   ```

4. **Verify Fixes**:
   - Run `npm audit` locally
   - Re-run the security workflow
   - Check that no HIGH/CRITICAL vulnerabilities remain

### Debugging

- Enable debug logging by setting `DEBUG=*` in environment
- Check workflow logs for detailed error messages
- Review artifact uploads for additional context
- Use workflow dispatch for manual testing

## Performance Considerations

- **Timeout Limits**: Jobs have appropriate timeout limits (15-30 minutes)
- **Parallel Execution**: Independent jobs run in parallel when possible
- **Caching**: npm dependencies are cached for faster builds
- **Native CI Testing**: Uses native environment for faster execution than Docker
- **CompactC Installation**: Optimized installation process for CI environment

## Security Features

- **Dependency Scanning**: Automated vulnerability detection
- **Code Analysis**: Security pattern detection
- **Contract Validation**: Smart contract security checks
- **Access Control**: Verification of security patterns
- **Audit Logging**: Comprehensive security reporting

## Contributing

When adding new workflows or modifying existing ones:

1. Follow the established naming conventions
2. Include appropriate timeout limits
3. Add comprehensive error handling
4. Document new environment variables
5. Update this README with new information
6. Test workflows locally before committing

## Support

For issues with workflows:

1. Check the workflow logs for error details
2. Review the troubleshooting section above
3. Create an issue with workflow logs attached
4. Tag the issue with `workflow` and `ci/cd` labels
