require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 15000;

const orgAndTokens = [
    { org: 'your_org_name', token: 'your_ghp_token' },
    // 可以继续添加更多组织和令牌
];

const inviteUserToOrg = async (org, token, invitee) => {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };

    let data = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(invitee) ? {email: invitee} : {invitee_id: await getGitHubUserId(invitee, headers)};

    if (!data.email && !data.invitee_id) {
        return {error: "User not found or invalid invitee"};
    }

    try {
        const response = await axios.post(`https://api.github.com/orgs/${org}/invitations`, data, {headers});
        console.log("邀请响应数据:", response.data)
        return {success: true, data: response.data};
    } catch (error) {
        console.error(`Error inviting user to ${org}:`, error.response.data);
        return {success: false, error: error.response.data};
    }
};

const getGitHubUserId = async (username, headers) => {
    try {
        const response = await axios.get(`https://api.github.com/users/${username}`, {headers});
        console.log("获取用户ID响应数据:", response.data)
        return response.data.id;
    } catch (error) {
        console.error('Error fetching GitHub user ID:', error.message);
        return null;
    }
};

app.get('/inviteUser', async (req, res) => {
    console.log("============================ 处理邀请 ============================")
    const {invitees} = req.query;
    console.log(`============================ 被邀请人信息：${invitees} ============================`)
    if (!invitees) {
        return res.json({code: -1, message: '被邀请人邮箱或用户名不可为空'});
    }

    for (const {org, token} of orgAndTokens) {
        const result = await inviteUserToOrg(org, token, invitees);
        if (result.success) {
            console.log(`============================ 成功邀请 ${invitees}加入${org} ============================`)
            return res.json({code: 0, message: '申请成功, 请手动接受邀请', url: `https://github.com/${org}`});
        }
    }

    res.json({code: -1, message: '邀请失败，请检查邀请限制或用户是否已在组织中'});
    console.log(`============================ 邀请失败 ============================`)
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
