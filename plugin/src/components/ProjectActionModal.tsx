import { Button } from '@ds-wizard/plugin-sdk/ui/Button'
import { DialogBody, DialogFooter, DialogHeader } from '@ds-wizard/plugin-sdk/ui/Dialog'
import { ReactNode } from 'react'

export type ModalProps = {
    modalTitle: ReactNode
    modalBody: ReactNode
    modalAction?: ModalAction
    modalSecondaryActions?: ModalAction[]

    onActionClose: () => void
}

export type ModalAction = {
    label: ReactNode
    icon?: string
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
}

export function ProjectActionModal({
    modalTitle,
    modalBody,
    modalAction,
    modalSecondaryActions = [],
    onActionClose,
}: ModalProps) {
    return (
        <>
            <DialogHeader title={modalTitle} />
            <DialogBody>{modalBody}</DialogBody>
            <DialogFooter>
                {/* Close on the left, the dialog's own actions on the right */}
                <Button
                    variant="ghost"
                    style={{ marginInlineEnd: 'auto' }}
                    onClick={() => onActionClose()}
                >
                    Close
                </Button>
                {modalSecondaryActions.map((action, index) => (
                    <Button
                        key={index}
                        variant="secondary"
                        icon={action.icon}
                        disabled={action.disabled}
                        loading={action.loading}
                        onClick={action.onClick}
                    >
                        {action.label}
                    </Button>
                ))}
                {modalAction && (
                    <Button
                        variant="primary"
                        icon={modalAction.icon}
                        disabled={modalAction.disabled}
                        loading={modalAction.loading}
                        onClick={modalAction.onClick}
                    >
                        {modalAction.label}
                    </Button>
                )}
            </DialogFooter>
        </>
    )
}
