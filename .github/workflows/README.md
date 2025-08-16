# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Marketplace Registry project. These workflows ensure code quality, security, and reliability through automated testing and validation.

## Available Workflows

### 1. CI Tests (`ci-tests.yml`)

**Purpose**: Core continuous integration pipeline that runs on every push and pull request.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Daily at 2:00 AM UTC (scheduled)

**Jobs**:
- **Contract Tests**: Compiles and tests the smart contract across Node.js versions (18.20.5, 20.x, 22.x)
- **CLI Tests**: Builds and tests the CLI application
- **Docker Validation**: Builds and validates the Docker image
- **Quality Checks**: Security audits, package consistency, and workspace validation
- **Integration Tests**: Full end-to-end testing (main branch only)
- **Test Report**: Generates comprehensive test summaries

**Matrix Testing**: Tests against multiple Node.js versions to ensure compatibility.

### 2. Integration Tests (`integration-tests.yml`)

**Purpose**: Comprehensive integration testing including testnet and local environment validation.

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch (with optional testnet flag)

**Jobs**:
- **Testnet Integration**: Tests against the actual testnet blockchain
- **Local Integration**: Tests in local environment with containers
- **Performance Tests**: Benchmarks and performance metrics (scheduled)

**Features**:
- Real blockchain interaction testing
- Performance benchmarking
- Comprehensive test reporting

### 3. Security & Audit (`security-audit.yml`)

**Purpose**: Security-focused analysis and vulnerability scanning.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly on Sundays at 3:00 AM UTC

**Jobs**:
- **Dependency Scan**: npm audit for known vulnerabilities
- **Code Analysis**: ESLint, TypeScript, and security pattern checks
- **Contract Security**: Smart contract security analysis
- **Security Summary**: Comprehensive security report

## Workflow Dependencies

```
ci-tests.yml
├── contract-tests
├── cli-tests (depends on: contract-tests)
├── docker-validation (depends on: contract-tests)
├── quality-checks (depends on: contract-tests)
├── integration-tests (depends on: contract-tests, cli-tests, docker-validation)
└── test-report (depends on: all above)

integration-tests.yml
├── testnet-integration
├── local-integration (depends on: testnet-integration)
└── performance-tests (depends on: testnet-integration, local-integration)

security-audit.yml
├── dependency-scan
├── code-analysis
├── contract-security
└── security-summary (depends on: all above)
```

## Manual Workflow Execution

### Trigger Integration Tests Manually

You can manually trigger the integration tests workflow:

1. Go to the **Actions** tab in your GitHub repository
2. Select **Integration Tests** workflow
3. Click **Run workflow**
4. Choose the branch and optionally enable testnet testing
5. Click **Run workflow**

### Testnet Testing

The integration tests can run against the actual testnet blockchain. This requires:

- Valid testnet configuration
- Proof server availability
- Test wallet setup

## Environment Variables

### Required for Testnet Tests

```bash
NODE_ENV=test
CI=true
RUN_ENV_TESTS=true
TEST_ENV=testnet
```

### Optional Environment Variables

```bash
FUND_WALLET_SEED=your_fund_wallet_seed
DESTINATION_ADDRESS=your_destination_address
FUNDING_AMOUNT=10000000
PAYMENT_AMOUNT=5000000
REGISTRATION_EMAIL=test@example.com
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
   - Verify `compactc` is available in CI environment
   - Check contract source syntax
   - Ensure all dependencies are installed

2. **Tests Fail in CI but Pass Locally**
   - Check Node.js version compatibility
   - Verify environment variables are set
   - Check for platform-specific issues

3. **Docker Build Fails**
   - Verify Dockerfile syntax
   - Check for missing dependencies
   - Ensure proper context and file copying

### Debugging

- Enable debug logging by setting `DEBUG=*` in environment
- Check workflow logs for detailed error messages
- Review artifact uploads for additional context
- Use workflow dispatch for manual testing

## Performance Considerations

- **Timeout Limits**: Jobs have appropriate timeout limits (15-90 minutes)
- **Parallel Execution**: Independent jobs run in parallel when possible
- **Caching**: npm dependencies are cached for faster builds
- **Matrix Testing**: Tests run against multiple Node.js versions efficiently

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
