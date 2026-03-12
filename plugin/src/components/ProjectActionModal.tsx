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
    disabled?: boolean
    onClick?: () => void
    className?: string
}

export function ProjectActionModal({
    modalTitle,
    modalBody,
    modalAction,
    modalSecondaryActions = [],
    onActionClose,
}: ModalProps) {
    const hasRightActions = modalSecondaryActions.length > 0 || Boolean(modalAction)

    return (
        <>
            <div className="modal-header">
                <h5 className="modal-title">{modalTitle}</h5>
            </div>
            <div className="modal-body">{modalBody}</div>
            <div className="modal-footer">
                <div className="w-100 d-flex align-items-center">
                    <button className="btn btn-secondary" onClick={() => onActionClose()}>
                        Close
                    </button>
                    {hasRightActions && (
                        <div className="btn-group ms-auto" role="group" aria-label="Action buttons">
                            {modalSecondaryActions.map((action, index) => (
                                <button
                                    key={index}
                                    className={action.className ?? 'btn btn-outline-primary'}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                >
                                    {action.label}
                                </button>
                            ))}
                            {modalAction && (
                                <button
                                    className={modalAction.className ?? 'btn btn-primary'}
                                    onClick={modalAction.onClick}
                                    disabled={modalAction.disabled}
                                >
                                    {modalAction.label}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
