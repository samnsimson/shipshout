import {
    githubAppPermissionsUpgradeUrl,
    installationCanListRepos,
    installationCanManageWebhooks,
} from '../../utils/github-api';

describe('github-app permissions', () => {
    it('detects repo list access from metadata permission', () => {
        expect(installationCanListRepos({ metadata: 'read' })).toBe(true);
        expect(installationCanListRepos({})).toBe(false);
    });

    it('detects webhook management from administration write', () => {
        expect(installationCanManageWebhooks({ administration: 'write' })).toBe(true);
        expect(installationCanManageWebhooks({ administration: 'read' })).toBe(false);
    });

    it('builds permissions upgrade URL with state', () => {
        expect(githubAppPermissionsUpgradeUrl('shipshout', 'ws-1')).toBe(
            'https://github.com/apps/shipshout/installations/new/permissions?state=ws-1',
        );
    });
});
