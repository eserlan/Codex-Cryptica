#!/bin/bash
echo "--- HOSTNAME ---"
hostname
echo "--- PWD ---"
pwd
echo "--- GIT STATUS ---"
git status
echo "--- GIT DIFF ---"
git diff
echo "--- GIT BRANCH ---"
git branch
echo "--- GIT CONFIG ---"
cat .git/config
