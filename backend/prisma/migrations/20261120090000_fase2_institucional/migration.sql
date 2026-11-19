-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('ASSIGNMENT_CREATED', 'SUBMISSION_RETURNED', 'POST_CREATED', 'COMMENT_CREATED', 'MATERIAL_CREATED', 'RESOURCE_REVIEWED') NOT NULL;

-- AlterTable
ALTER TABLE `Resource` ADD COLUMN `mimeType` VARCHAR(191) NOT NULL,
    ADD COLUMN `originalName` VARCHAR(191) NOT NULL,
    ADD COLUMN `reviewNote` VARCHAR(500) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL,
    ADD COLUMN `size` INTEGER NOT NULL,
    ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `StudyGroup` ADD COLUMN `meetingInfo` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `CourseTopic` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CourseTopic_courseId_position_idx`(`courseId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('FILE', 'LINK') NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `url` VARCHAR(500) NULL,
    `originalName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `sha256` CHAR(64) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CourseMaterial_fileUrl_key`(`fileUrl`),
    INDEX `CourseMaterial_courseId_topicId_idx`(`courseId`, `topicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyGroupMember` (
    `groupId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudyGroupMember_userId_idx`(`userId`),
    PRIMARY KEY (`groupId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Resource_fileUrl_key` ON `Resource`(`fileUrl`);

-- CreateIndex
CREATE INDEX `Resource_status_createdAt_idx` ON `Resource`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `StudyGroup_subjectId_idx` ON `StudyGroup`(`subjectId`);

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseTopic` ADD CONSTRAINT `CourseTopic_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseMaterial` ADD CONSTRAINT `CourseMaterial_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseMaterial` ADD CONSTRAINT `CourseMaterial_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `CourseTopic`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseMaterial` ADD CONSTRAINT `CourseMaterial_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyGroupMember` ADD CONSTRAINT `StudyGroupMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `StudyGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudyGroupMember` ADD CONSTRAINT `StudyGroupMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

