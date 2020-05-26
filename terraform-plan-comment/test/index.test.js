jest.mock('../../utils/src/pull-request-info');
jest.mock('@actions/core');
jest.mock('../src/generate-outputs');

const mockComment = jest.fn();

jest.mock('@actions/github', () => ({
  GitHub: function GitHub() {
    return {
      issues: {
        createComment: mockComment,
      },
    };
  },
  context: {
    repo: () => ({
      owner: 'extenda',
      repo: 'actions',
    }),
  },
}));

const core = require('@actions/core');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const action = require('../src/index');
const generateOutputs = require('../src/generate-outputs');

const orgEnv = process.env;

describe('Terraform plan comment', () => {
  afterEach(() => {
    jest.clearAllMocks();
    process.env = orgEnv;
  });

  beforeEach(() => {
    getPullRequestInfo.mockResolvedValueOnce({
      number: 1,
      base: { ref: 'master' },
      head: { ref: 'feature/test' },
    });
    core.getInput.mockReturnValue('');
    process.env = {
      ...orgEnv,
      GITHUB_WORKFLOW: 'Terraform',
      GITHUB_REPOSITORY: 'extenda/actions',
    };
  });

  test('It can generate comment for multiple plans', async () => {
    generateOutputs.mockResolvedValueOnce([
      { module: 'folder/moduleA', output: 'Plan A output', status: 0 },
      { module: 'folder/moduleB', output: 'Plan B output', status: 0 },
      { module: 'folder/nested/moduleC', output: 'Plan C output', status: 0 },
      { module: 'folder/nested', output: 'Plan nested output', status: 0 },
    ]);

    const comment = await action();
    expect(comment).toEqual(`**:earth_americas: Terraform plan changes**

The output only includes modules with changes.

<details>
<summary>Show output from 4 modules</summary>

:arrow_forward: **folder/moduleA**
\`\`\`hcl
Plan A output
\`\`\`
:arrow_forward: **folder/moduleB**
\`\`\`hcl
Plan B output
\`\`\`
:arrow_forward: **folder/nested/moduleC**
\`\`\`hcl
Plan C output
\`\`\`
:arrow_forward: **folder/nested**
\`\`\`hcl
Plan nested output
\`\`\`

</details>

*Workflow: \`Terraform\`*
*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It can generate comment for single plan', async () => {
    generateOutputs.mockResolvedValueOnce([
      { module: 'work', output: 'Plan output', status: 0 },
    ]);

    const comment = await action();
    expect(comment).toEqual(`**:earth_americas: Terraform plan changes**

The output only includes modules with changes.

<details>
<summary>Show output from 1 module</summary>

:arrow_forward: **work**
\`\`\`hcl
Plan output
\`\`\`

</details>

*Workflow: \`Terraform\`*
*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It can generate comment for no changes', async () => {
    generateOutputs.mockResolvedValueOnce([]);
    const comment = await action();
    expect(comment).toEqual(`**:white_check_mark: No changes**\n\nTerraform plan reported no changes.\n\n*Workflow: \`Terraform\`*\n*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It skips execution if not a pull request', async () => {
    getPullRequestInfo.mockReset();
    getPullRequestInfo.mockResolvedValueOnce(null);
    const comment = await action();
    expect(core.warning).toHaveBeenCalledWith('Skipping execution - No open pull-request found.');
    expect(generateOutputs).not.toHaveBeenCalled();
    expect(comment).toBeNull();
  });

  test('It can generate comment for custom repo and pull number', async () => {
    core.getInput.mockReset();
    core.getInput.mockReturnValueOnce('plan.out')
      .mockReturnValueOnce('infra')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('3');
    generateOutputs.mockResolvedValueOnce([]);
    const comment = await action();
    expect(generateOutputs).toHaveBeenCalled();
    expect(comment).toBeTruthy();
    expect(mockComment.mock.calls[0][0]).toMatchObject({
      owner: 'extenda',
      repo: 'test-repo',
    });
  });

  test('It throws if remote repository and no pull number is provided', async () => {
    core.getInput.mockReset();
    core.getInput.mockReturnValueOnce('plan.out')
      .mockReturnValueOnce('infra')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('');
    generateOutputs.mockResolvedValueOnce([]);
    await expect(action()).rejects.toEqual(new Error('pull-request-number must be provided for remote repository.'));
  });
});
